# BCUTZ — Security Review

Read-only audit of the `~/bcutz-new` repo (edge functions, RLS migrations, frontend, config). Scope: auth/RLS, injection, XSS, secrets, dependencies, CORS/env. No code was changed.

**Bottom line:** the money/auth/RLS core is well-built. No exposed secrets, no live SQL injection, no live frontend XSS, no arbitrary-user deletion, no live privilege escalation. One MEDIUM (authorization gap in chat-notification) and a handful of LOW / defense-in-depth items.

---

## LIVE FINDINGS

### 1. MEDIUM — `send-chat-notification` missing participant check (IDOR → notification/push spam & phishing)
**File:** `supabase/functions/send-chat-notification/index.ts` (lines ~22–48)

**What:** The function authenticates the caller, then reads a conversation by the caller-supplied `conversationId` **using the service-role client (RLS bypassed)** and never checks that the caller is actually a participant:

```ts
if (user.id === conv.customer_id) {
  // notify barber
} else {
  // notify customer   ← fires for ANY caller who isn't the customer
  recipientUserId = conv.customer_id;
}
```

**Why exploitable:** Any logged-in user (signup is open) who knows a `conversationId` falls into the `else` branch and pushes an **attacker-controlled `message`** as an in-app notification + FCM push to that conversation's customer — a phishing/spam vector ("Booking confirmed, pay here: …"). `senderName` is the attacker's own profile name, so it's not full impersonation, but the body is fully attacker-chosen.

**Mitigating factor (why MEDIUM, not HIGH):** `conversationId` is a random UUID and the `conversations` table's SELECT policy is participant-scoped, so IDs aren't enumerable via the API. Exploit needs a leaked/shared conversation ID. Still worth fixing — the `else`-treats-everyone-as-the-barber logic is a correctness bug too.

**Fix:** authorize the caller as a participant before sending.

```ts
const { data: callerBarber } = await supabase
  .from("barber_profiles").select("id").eq("user_id", user.id).maybeSingle();

const isCustomer = user.id === conv.customer_id;
const isBarber   = callerBarber?.id === conv.barber_id;
if (!isCustomer && !isBarber) throw new Error("Forbidden: not a participant");

const recipientUserId = isCustomer
  ? (await supabase.from("barber_profiles").select("user_id").eq("id", conv.barber_id).single()).data?.user_id
  : conv.customer_id;
```

---

### 2. LOW — `has_role(uuid, app_role)` executable by `authenticated` (privileged-account enumeration)
**Files:** `supabase/migrations/20260112091602_*.sql:4`, `20260116102640_*.sql:3`, `20260120080411_*.sql:65` (anon revoked; **authenticated still granted**)

**Why exploitable:** Any logged-in user can call `has_role('<some-uuid>','admin')` / `'founder'` and learn who holds privileged roles, enabling targeted attacks. The self-only wrapper `current_user_has_role` already covers legitimate client needs.

**Fix:**
```sql
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM authenticated;
-- clients keep public.current_user_has_role(app_role) for self-checks
```

---

### 3. LOW — Unescaped dynamic values interpolated into HTML emails (HTML/link injection)
**Files:**
- `supabase/functions/send-barber-notification/index.ts:157` — `... '<strong>' + t.reason + ':</strong> ' + reason + '</p>...'` (admin-supplied rejection `reason`, plus `shopName`)
- `supabase/functions/send-welcome-email/index.ts` — user `name`
- `supabase/functions/delete-user-account/index.ts` — `full_name`, `founder_message`

**Why exploitable:** Values controlled by users/admins (shop name at signup, full name, founder broadcast text) are concatenated into HTML email bodies without escaping. Most mail clients strip `<script>`, but injected markup/`<a href>` enables spoofed content and phishing links inside a legitimately-branded BCUTZ email.

**Fix:** escape before interpolation.
```ts
const esc = (s = "") => s.replace(/&/g,"&amp;").replace(/</g,"&lt;")
  .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
// ... '<strong>' + esc(t.reason) + ':</strong> ' + esc(reason) + ...
```

---

### 4. LOW / informational — Wildcard CORS on all edge functions
**File:** `supabase/functions/_shared/cors.ts` (`Access-Control-Allow-Origin: '*'`, `isOriginAllowed()` returns `true`)

**Why low:** auth is bearer-token (not cookies), so classic CSRF doesn't apply. But `*` lets any origin invoke the functions and removes origin as a defense layer.

**Fix:** allow-list only production + preview origins:
```ts
const ALLOWED = ["https://bcutz.com","https://preview--bcutz.lovable.app"];
const origin = req.headers.get("Origin") ?? "";
const allowOrigin = ALLOWED.includes(origin) ? origin : ALLOWED[0];
```

---

### 5. LOW / defense-in-depth — No Content-Security-Policy
**File:** `index.html` (no CSP meta; no header config in repo)

**Why it matters:** the SPA processes payments and stores the Supabase session in `localStorage`, so any XSS = session/account takeover. Known sinks are DOMPurify-sanitized (good), but a CSP is the safety net for the unknown ones.

**Fix:** serve a CSP header from the host (Netlify `_headers` / Vercel `headers`), e.g. `default-src 'self'; script-src 'self'; connect-src 'self' https://*.supabase.co https://api.stripe.com; frame-src https://js.stripe.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'`. Tune against Stripe/Firebase/Maps.

---

### 6. INFORMATIONAL — Supabase session tokens in `localStorage`
**File:** `src/integrations/supabase/client.ts` (`auth.storage: localStorage`)

Standard Supabase SPA pattern; not a bug. It does raise the impact of any XSS (token exfiltration). No action required beyond keeping XSS defenses (DOMPurify + CSP) tight. `VITE_*` keys are the public anon/publishable keys — correct to ship.

---

## VERIFIED SECURE (positives)

- **Payments:** server-side price enforcement; Stripe webhook signature verified via `constructEventAsync`; Connect payouts gated.
- **Edge-function auth:** all cron/email functions gated `token !== SUPABASE_SERVICE_ROLE_KEY → 403`; `send-push-notification` is service-role-gated **despite `verify_jwt=false`**; `send-admin-role-notification` founder-gated; `send-barber-notification` admin-gated (`user_roles … role='admin'`); `check-birthday-bonus` self-scoped via `getClaims`.
- **`delete-user-account`:** no arbitrary deletion — self-only or founder path (RPC-gated), refuses to delete founders; confirmation checks `stored.user_id === actingUser.id`.
- **RLS:** `conversations`/`chat_messages` fully participant-scoped; storage buckets folder-scoped + extension whitelist + 50 MB video cap; `barber_profiles_public` view excludes IBAN, account holder, Stripe IDs, phone; filtered to verified+active.
- **Public RPCs:** `get_barber_profile_public` / `list_public_barber_profiles` are `SECURITY DEFINER` **with `SET search_path = public`** and return non-PII only. (No live SECURITY-DEFINER function is missing `search_path`.)
- **Input validation:** Zod schemas + UUID regex + length caps in push path.
- **Secrets:** none hardcoded in `src/` or config.
- **Capacitor:** `cleartext`/`webContentsDebuggingEnabled` dev-only; `allowMixedContent:false` in prod; `server.url` dev-only; no wildcard `allowNavigation`.
- **Frontend XSS:** the three `dangerouslySetInnerHTML` sinks are safe — chart CSS (developer-controlled) and two email previews wrapped in `DOMPurify.sanitize(...)` with allow-lists.
- **Lockfiles committed** (`bun.lock`, `package-lock.json`) → reproducible installs.

---

## HISTORICALLY FIXED — verify against the deployed DB

Confirm the live Supabase project (`mistdeyttbkqrxcvnrlp`) actually matches these migrations:

1. **Privilege escalation via `user_roles` self-insert** — the `WITH CHECK (auth.uid() = user_id)` insert policy (from `20260110154959`) was **dropped** in `20260112062322`; role acquisition now goes through `request_barber_role()` (SECURITY DEFINER, barber-only). Result: `user_roles` has **no** client INSERT policy → default-deny. Verify no INSERT policy exists in prod.
2. **Notification spoofing via `WITH CHECK(true)`** — those permissive insert policies were created then dropped (`20260112085903/085910`, `20260113141416/141425`); final state is `auth.uid() = user_id` + admin insert. Verify in prod.
3. **`has_role` grants** — confirm `anon` no longer has EXECUTE (revoked `20260120080411`) and apply finding #2 for `authenticated`.

---

## Dependencies / config notes

- No obviously CVE-pinned packages on read; `dompurify ^3.3.1` (patched range), `@supabase/supabase-js ^2.90.1`, all caret ranges. Run `bun audit` / `npm audit` in CI for authoritative CVE status (couldn't run offline here).
- `vite.config.ts`, `capacitor.config.ts` — no secrets, no risky flags in prod paths.

---

## Suggested fix order
1. #1 chat-notification participant check (MEDIUM).
2. #2 `has_role` revoke + #3 email escaping (quick, low-risk).
3. #4 CORS allow-list + #5 CSP (deploy-config).
4. Verify the three historical fixes are live in prod (#1–3 above).

---

## Dependency audit — `npm audit` run 2026-07-03 (bun unavailable in sandbox; lockfile-equivalent)

24 advisories: **15 high, 8 moderate, 1 low**. Every one reports `fixAvailable: true` → resolvable with semver-**compatible** updates (no forced major bumps). Apply on the Mac with bun so `bun.lock` stays authoritative:

```bash
cd ~/bcutz-new
bun update react-router-dom dompurify @capacitor/cli   # the three direct deps
bun install                                            # refresh transitive tree
bun run build                                           # confirm nothing broke
```

Triage by whether the code actually ships to the browser:

**Ships in the client bundle — patch first:**
- `react-router-dom` ^7.12.0 (HIGH, via `react-router`): advisories include a protocol-relative `//` open-redirect and CSRF on document requests. The turbo-stream RCE / single-fetch / prerender-XSS items are SSR/RSC-mode only and do **not** apply to this client-only Vite SPA — but the upgrade is compatible, so take it anyway.
- `dompurify` ^3.3.1 (MODERATE): multiple sanitizer-bypass / mutation-XSS advisories. Directly used with `dangerouslySetInnerHTML` in `src/components/EmailPreviewSheet.tsx` and `src/pages/FounderEmailPreview.tsx`. Input is admin/founder-controlled email templates (low exploitability) but bump to ≥3.4.11 regardless.

**Build/dev tooling only — not in the deployed bundle (lower real risk, still update):**
- `@capacitor/cli` (HIGH, via `tar`) — native-build tooling; the tar path-traversal advisories only bite during `bun install` / archive extraction, not at runtime.
- `vite`, `esbuild`, `postcss`, `workbox-build`, `ws`, `yaml`/`js-yaml`, `@babel/*`, `glob`, `minimatch`, `serialize-javascript`, `lodash`, `flatted`, `fast-uri`, `@xmldom/xmldom` — all transitive dev/build dependencies.

Net: no CRITICALs, and only two browser-shipped packages carry advisories, both fixable with a compatible bump.
