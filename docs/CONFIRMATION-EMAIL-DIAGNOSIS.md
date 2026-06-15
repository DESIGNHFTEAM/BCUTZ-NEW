# Signup confirmation emails — diagnosis & fix runbook

**Date:** 2026-06-14  ·  **Project:** Supabase `mistdeyttbkqrxcvnrlp` (PROD)  ·  **Status:** root cause proven, fix is operator-side

Complaint: *"Bestätigungs-Mails beim Account-Erstellen funktionieren nicht."*

---

## TL;DR

All Bcutz email — Supabase **Auth** confirmation mail (dashboard custom SMTP) **and** every app
edge function (`_shared/smtp.ts`) — is sent through **Hostpoint shared SMTP**
(`asmtp.mail.hostpoint.ch`, from `team@bcutz.com`). That single dependency causes two distinct
failures:

1. **Deterministic 500** when the signup email is on a **Hostpoint-hosted domain**
   (`@bcutz.com`, `@designhf.ch`). Hostpoint does *local* delivery for those domains and replies
   `550 unroutable adress` for any non-existent mailbox → GoTrue returns
   `500 Error sending confirmation email` → **the user row is rolled back (no account created)**.
   This is what you hit when testing signup with an own-domain test address.

2. **Spam-risk** for external recipients (gmail/yahoo/etc.). They *do* work today, but `bcutz.com`
   has **no DKIM** and **DMARC `p=quarantine`** on a brand-new domain → confirmations can silently
   land in spam.

**External signups are NOT fully broken** — 3 real users (2 gmail, 1 yahoo) received and clicked
the confirm link, most recently 2026-06-10. The failure is scoped, not total.

---

## Evidence

| Probe | Result |
|---|---|
| `GET /auth/v1/settings` | `200` · `mailer_autoconfirm:false` (confirmations required), `disable_signup:false` |
| `POST /signup` `team+curl…@designhf.ch` | `500` · log: `gomail: could not send email 1: 550 unroutable adress` |
| `POST /recover` `team@designhf.ch` (real mailbox) | `200` · `recovery_sent_at` stamped → Hostpoint transport + creds OK |
| `auth.users` real email signups | `alijahalil.ha09@gmail.com` (06-10), `ermiasn055@gmail.com` (06-06), `natnael_ermias@yahoo.com` (05-26) — all `confirmation_sent_at` set, **confirmed**, no rollback |
| `dig TXT bcutz.com` | `v=spf1 redirect=spf.mail.hostpoint.ch` (SPF OK, aligns via Hostpoint relay) |
| `dig TXT _dmarc.bcutz.com` | `v=DMARC1; p=quarantine;` |
| DKIM (`*._domainkey.bcutz.com`, many selectors) | **none found** (same for designhf.ch) |
| `dig MX bcutz.com` | `mx1/mx2.mail.hostpoint.ch` → Hostpoint hosts the domain → local delivery for self-domain |

Code: `supabase/functions/_shared/smtp.ts` uses `denomailer` with `SMTP_HOST/PORT/USER/PASS` and
sends `from: smtpUser` (so the From address = the SMTP auth username).

---

## Immediate unblock (no infra change)

To verify signup right now, **test with an external address (gmail/outlook), not `@bcutz.com`/`@designhf.ch`.**
Own-domain test addresses will always 550 on Hostpoint and is NOT representative of real customers.

---

## Fix — Option A (recommended): move all mail to Resend

Resend relays everything as an external sender (kills the self-domain 550) **and** domain
verification publishes DKIM (fixes spam under DMARC quarantine). One provider for Auth + app email.

1. Create/verify `bcutz.com` in Resend → add the **DKIM + SPF/Return-Path DNS records** Resend gives
   you (at Hostpoint DNS). Wait for "Verified".
2. Create a Resend **API key** (`re_…`).
3. **Supabase Auth SMTP** (Dashboard → Authentication → Emails → SMTP):
   host `smtp.resend.com`, port `465`, user `resend`, pass `<API key>`,
   sender `noreply@bcutz.com` (or `team@bcutz.com`), a sender name.
4. **Edge-function secrets** (Dashboard → Edge Functions → Secrets, or `supabase secrets set`):
   `SMTP_HOST=smtp.resend.com`, `SMTP_PORT=465`, `SMTP_USER=resend`, `SMTP_PASS=<API key>`.
5. ⚠️ **Code prerequisite for step 4:** `_shared/smtp.ts` currently sends `from: smtpUser`. With
   Resend, `SMTP_USER` is the literal string `resend`, which is an invalid From. Add a dedicated
   sender var (backward-compatible — falls back to current behaviour on Hostpoint):

   ```ts
   const smtpFrom = Deno.env.get("SMTP_FROM") || smtpUser;
   // ...
   await client.send({ from: smtpFrom, /* ... */ });
   ```
   then set `SMTP_FROM=noreply@bcutz.com` and redeploy the send-* functions.

## Fix — Option B (stopgap, stays on Hostpoint)

Enable **DKIM for bcutz.com in the Hostpoint control panel** and publish the record. Improves
external deliverability under `p=quarantine`. **Does NOT fix the self-domain 550** (inherent to
Hostpoint local delivery) — so keep testing with external addresses.

> All of the above require account/credential/DNS access and are operator actions — do them yourself;
> do not paste SMTP passwords or API keys into the assistant.

---

## Separate bugs found (not the email issue)

- **`auto-suspend-abusive-accounts` cron → 404 every ~5 min.** No such edge function exists in the
  repo. Either deploy the function or remove/disable the scheduled job.
- **`send-booking-reminders` → 401 periodically.** Function exists (`verify_jwt = false` in
  config.toml) but the cron invocation is unauthorized — check the cron's auth header / service-role key.
