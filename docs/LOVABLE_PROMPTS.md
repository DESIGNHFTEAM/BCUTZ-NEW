# BCUTZ — Lovable Prompt Pack (2026-05-05)

Each section below is a **single, focused prompt** you paste into Lovable's chat. They're ordered by launch impact — start with §1 and work down. Lovable should treat each prompt as a contained change; **don't combine prompts**, paste them one at a time and review each diff before moving on.

> **Constraint to repeat in EVERY prompt if Lovable starts drifting:**
> "Do NOT modify `supabase/migrations/`, `supabase/functions/`, `validate_booking_price`, or anything that affects `platform_fee` (must stay 2.00 CHF). Do not change `src/integrations/supabase/types.ts` — it is generated. Stay in `src/`."

---

## §1 — Generate the missing OG social card image (BLOCKER)

```
We need a social-share OG image at /public/og-image.png (1200×630, PNG).

It's referenced from index.html via the og:image and twitter:image meta tags but the file doesn't exist yet — sharing the site to LinkedIn / X / iMessage will currently show a broken preview.

Please create a new file public/og-image.png that's a 1200×630 dark-mode social card with:
- Dark background (#0a0a0a or matching theme)
- "BCUTZ" wordmark large and centered, using the same font/style as the navbar logo
- Tagline below in muted off-white: "Book Your Perfect Cut"
- Subtle accent — a thin gold or accent-colored underline/scissor icon
- 80px safe-zone padding on all sides

If you can't generate raster PNGs directly, instead create public/og-image.svg of the same design at 1200×630 and update index.html to reference og-image.svg in BOTH the og:image meta tag AND the twitter:image meta tag. Update og:image:type to "image/svg+xml" if you take the SVG path.

Don't change anything else.
```

---

## §2 — Customer: Map view for /barbers (real gap)

```
On the /barbers (Find Barbers) page, we have a Grid/Rows3 view toggle but no Map view. Customers want to see barbers spatially.

Add a third view mode "Map" alongside Grid and Rows3 in src/pages/Barbers.tsx. Use Leaflet (react-leaflet) since it's free and we already have lat/long on barber_profiles (latitude, longitude DECIMAL).

Requirements:
1. Add react-leaflet + leaflet to dependencies
2. Add a third toggle button next to Grid/Rows3 (use the MapPin icon from lucide-react that we already import)
3. When Map view is active, render a full-width Leaflet map roughly 60vh tall, centered on the average lat/long of the filtered barbers (default Zurich 47.3769, 8.5417 if no barbers)
4. Each barber with non-null latitude AND longitude becomes a marker; clicking the marker opens a small popup with shop_name, avg_rating with star, city, and a "View profile" button that navigates to /barber/:id
5. Skip barbers with null coordinates — show a small banner: "X barbers don't have map locations yet. View them in Grid or List."
6. Persist the user's view mode choice in localStorage under "bcutz.barbers.viewMode"
7. Use OpenStreetMap tiles (no Mapbox / Google Maps API key needed)
8. Make sure the map container has a defined height — Leaflet renders blank otherwise
9. Match the dark theme: use a dark CartoDB Voyager tile layer if available, otherwise the default OSM tiles

Do not modify the filter / search / sort logic — only add the new view mode.
```

---

## §3 — Customer: Surface Reschedule action on Bookings page

```
We have a working RescheduleDialog component (src/components/RescheduleDialog.tsx) that writes to the reschedule_requests table, but it's not wired into the customer's My Bookings page (src/pages/Bookings.tsx).

In src/pages/Bookings.tsx:
1. Import RescheduleDialog
2. Add a "Reschedule" button to each upcoming booking card next to the existing Cancel button
3. Use the same canCancelBooking guard (booking is more than 1 hour away AND not already cancelled/completed) — same rule applies to reschedule
4. Use the t('bookings.reschedule') key which already exists in en/de/fr/it locales
5. When clicked, open RescheduleDialog with that booking
6. After a successful reschedule submission, show a toast and re-fetch the bookings list
7. Add a small "Reschedule requested" pill on the booking card if a row exists in reschedule_requests with status='pending' for that booking_id

Do NOT change cancellation logic. Do NOT touch the validate_booking_price trigger or platform_fee.
```

---

## §4 — Customer: Show review eligibility + write-review CTA prominently

```
On src/pages/Bookings.tsx, completed bookings should clearly show whether the customer has reviewed yet.

For each booking with status='completed':
1. If reviews relation is empty for that booking → show a prominent gold/yellow "Leave a review" button that opens the existing WriteReviewDialog (already imported)
2. If a review exists → show "★★★★☆ Reviewed" pill with the star count, and a "View" link that scrolls to that review on the barber's profile page (/barber/:id#review-<id>)
3. Sort completed bookings so unrated ones appear at the top of the completed section — gentle nudge to leave reviews

Don't change the data model. Reuse the existing reviews relation already being fetched.
```

---

## §5 — Barber: Stripe Connect onboarding banner on Dashboard

```
We have a StripeConnectSetup component (src/components/StripeConnectSetup.tsx) and a check-connect-status edge function. Barbers can't receive payouts until their Connect account is fully onboarded, but right now there's no nudge on the main barber Dashboard.

In src/pages/Dashboard.tsx (the barber dashboard, layout='barber'):
1. On mount, call the get_barber_stripe_status RPC for the current barber's profile
2. If status is anything other than "active" / "verified", render a sticky alert banner at the top of the dashboard:
   - Icon: AlertTriangle
   - Title: "Complete your payout setup"
   - Message: "You can't receive payouts until your Stripe Connect account is fully verified. This takes about 5 minutes."
   - CTA button: "Set up payouts" → opens StripeConnectSetup in a Dialog
3. Once status flips to verified, hide the banner and show a small green "Payouts active" pill in the dashboard header
4. The banner should be dismissible per-session but reappear on next login if status is still incomplete

Use the existing alert-dialog or alert components from /components/ui — match the style of the rest of the dashboard.
```

---

## §6 — Barber: Reviews tab improvements (visibility + reply flow)

```
On src/pages/DashboardReviews.tsx, polish the barber-side review experience.

1. At the top, show three KPI cards: Total reviews, Average rating (with stars), Reviews awaiting reply count
2. Default sort = "Awaiting reply first" (reviews where barber_reply IS NULL), then newest. Add a sort dropdown: Awaiting reply / Newest / Oldest / Highest / Lowest
3. Each review card should show: customer avatar (avatar_url from profiles, fall back to initials), customer first name only (privacy — don't show full name), star rating, comment, date, and either the existing barber reply (if present, shown in an indented bubble) or a "Reply" button that opens BarberReviewReplyDialog (already exists at src/components/BarberReviewReplyDialog.tsx)
4. After replying, the review moves down in the list (since it's no longer awaiting reply) and shows the reply bubble inline
5. Empty state when there are zero reviews: friendly message "No reviews yet. After your first completed booking, customers can rate you 1–5 stars."

Reuse existing types from src/integrations/supabase/types.ts — do not regenerate types.
```

---

## §7 — Barber: Make DashboardServices edit flow clearer

```
On src/pages/DashboardServices.tsx, the edit/delete dialogs work but the UX is cramped.

1. Each service card should have a clearly labeled three-dot menu (DropdownMenu) with two items: "Edit" and "Delete" — currently the buttons may not be obvious
2. The Edit dialog should show the existing values pre-filled (name, description, duration, price, is_active toggle) — verify this is happening; if not, fix
3. Add a clear "Active / Hidden from booking" toggle inline on each service card so barbers can quickly hide services without opening a dialog
4. Show the service price prominently in CHF with .toFixed(2) formatting
5. Add a duration badge (e.g. "30 min") next to each service
6. Empty state: "No services yet. Add your first service to start accepting bookings." with a primary CTA button

Don't change the underlying CRUD logic — only the visual presentation and the inline active toggle.
```

---

## §8 — Admin: Permission revocation flow polish

```
On src/pages/AdminBarberVerification.tsx, the revoke flow exists but needs sharper UX.

1. Verified barbers should show a clear "Verified" badge with a checkmark; unverified should show "Pending verification" pill
2. The revoke confirmation dialog (already partially built) should require the admin to type the shop name to confirm — prevents accidental revocations
3. After revoke, the barber should immediately drop off "Verified" lists across the app (the data already updates; just ensure UI reflects it)
4. Log every grant/revoke action via the existing log_admin_activity RPC — verify this is being called; if not, add it
5. Add a "Revoke reason" textarea (free-text, optional) that's stored in admin_activity_log.details JSONB

Reuse current_user_has_role('admin') guards; don't bypass any RLS.
```

---

## §9 — Founder: Activity Log read-only mode

```
src/pages/FounderActivityLog.tsx currently displays admin_activity_log entries but doesn't enforce read-only behavior in the UI.

1. Make every row strictly non-editable — no edit buttons, no delete buttons, no inline editing
2. Add a clear banner at the top: "Activity log is read-only. All entries are immutable." (i18n key: 'founder.log.readonly')
3. Add filters at the top: Date range, Action type (grant/revoke/etc), Actor name (search)
4. Add export to CSV button — use existing exportUtils.ts pattern
5. Pagination: 50 rows per page, infinite scroll OR paginated — pick whichever is consistent with the rest of the founder pages
6. Each row should show: timestamp, actor (with admin/founder badge), action_type, target user/barber name, details JSON (rendered as a small expandable code block)

Don't add any DB-level changes. The log is server-protected by RLS; this is purely UI.
```

---

## §10 — Founder: Admin Management response feedback

```
src/pages/FounderAdminManagement.tsx already has grant/revoke/delete actions. Improvements:

1. After every action, show a persistent success toast (5 seconds) with the action summary
2. The page should re-fetch the user_roles list automatically after any action (real-time subscription or refetch on action complete)
3. Show "Email notification sent" confirmation in the toast — the send-admin-role-notification edge function should fire; verify it's being called
4. Highlight founders separately from admins in the list — different badge color, locked icon (founders can't be revoked here)
5. Block the founder from revoking their own founder role with a clear message: "You cannot revoke your own founder role. Use SQL access if needed."

Match existing UI patterns — same alert-dialog style as the verification page.
```

---

## §11 — Install page CTA polish

```
src/pages/Install.tsx has placeholder buttons for App Store and Play Store.

1. The App Store button should link to a real App Store URL once the app is live — for now use href="#" with a tooltip "Coming soon to the App Store"
2. The Play Store button should do the same
3. Add a clear "PWA / Web App" install card with the prompt: "No app store needed — install directly from your browser." Include a button that triggers the beforeinstallprompt PWA install if available, falls back to instructions per platform (iOS: "Add to Home Screen", Android: Chrome menu)
4. Use the PushNotificationPrompt component (already exists) inline on this page after install
5. QR code: generate a QR code that links back to bcutz.com/install for easy desktop-to-mobile transfer
```

---

## §12 — Mobile responsive sweep

```
Do a focused mobile responsive audit of the customer-facing public pages: /, /barbers, /barber/:id, /how-it-works, /for-professionals, /pricing.

Specifically check at iPhone SE (375×667), iPhone 14 (390×844), and Pixel 5 (393×851) widths:
1. No horizontal scrollbars
2. Text is readable (≥14px body, ≥16px on inputs to prevent iOS zoom-on-focus)
3. Tap targets ≥44×44 px
4. The MobileBottomNav (src/components/MobileBottomNav.tsx) doesn't overlap content — pages should have pb-20 bottom padding
5. The /barbers grid collapses cleanly to 1 column at narrow widths
6. The booking flow on /barber/:id is one-handed thumb-reachable

Use Tailwind responsive prefixes (sm:, md:, lg:). Do not change desktop layouts.
```

---

## §13 — Polish: Cookie consent banner on first visit

```
src/components/CookieConsent.tsx exists but verify it actually shows on first visit:
1. On first page load (no localStorage flag set), the cookie banner should slide up from bottom
2. Three options: Accept all, Reject non-essential, Customize
3. After choice, set localStorage flag and never show again unless user clicks the small "Cookie settings" link in the footer
4. The banner shouldn't block the screen — it's a bottom sheet, max 240px tall on desktop, full-width on mobile, dismissable
5. Customize should let users toggle: Essential (always on, locked), Analytics, Marketing
6. Link to /cookies for the full policy

Required for GDPR / Swiss FADP compliance — must work before launch in EU/CH.
```

---

## §14 — i18n sweep on cancellation policy + ToS pages

```
The CHF 2.00 platform fee strings already exist in en/de/fr/it locales. Verify:

1. /privacy, /terms, /cookies pages all render correctly in all four languages
2. The language switcher in the navbar updates the page text without a reload
3. The locale persists across page navigations (already using localStorage probably)
4. Any new strings added in this prompt pack must be added to all four locale files (en, de, fr, it)
5. Date formatting on Bookings, ActivityLog uses the locale (e.g., "5. Mai 2026" in de, "May 5, 2026" in en)

Don't introduce new locales. Don't change platform_fee value (it must stay CHF 2.00 in all locales — already correct).
```

---

## §15 — App Store screenshots — automated capture

```
We need App Store screenshots at iPhone 6.7" (1290×2796), 6.5" (1284×2778), 5.5" (1242×2208), iPad Pro 12.9" (2048×2732), and Android 7"/10" tablet sizes.

The src/pages/ScreenshotMockups.tsx page exists for this purpose. Polish it so:

1. It's accessible at /dev/screenshots (already in routes)
2. It renders a dropdown to select target screen size — when picked, the page becomes exactly that size (use CSS scale or a fixed width container)
3. It cycles through 5–7 hero screens of the app: discover barbers, barber profile, booking confirmation, my bookings, loyalty rewards
4. Each mockup has a marketing tagline overlay at the top and a phone frame around the actual screenshot content
5. Add a "Capture" button that uses html2canvas to download a PNG of the current mockup at the target resolution

Reference docs/APP_STORE_LISTING.md for the marketing copy of each screen.
```

---

## How to use this pack

- **Order matters for §1–§5** — those are launch-blocking. §6–§14 are role-by-role polish that can ship in any order.
- **Always paste one section at a time.** Don't paste two prompts together; Lovable can drift if you do.
- **Review each diff** in the Lovable preview before clicking commit. If something looks off, ask Lovable to revise within the same conversation rather than starting fresh.
- **After each merged Lovable change**, sync locally:
  ```bash
  cd ~/bcutz-new
  git pull origin main
  bun install   # if Lovable added a dependency
  bun run dev   # smoke test in browser
  ```
- **Before redeploy**, run a final sanity pass: `bun run build` should succeed with zero TS errors. If Lovable changed types or added imports that don't exist, fix in code (Read/Edit) before pushing.

---

## Out of scope for Lovable (do these via code or in dashboards)

These don't go through Lovable:
- App Store Connect metadata + binary upload (Xcode → Archive → Distribute)
- Stripe webhook registration (Stripe Dashboard)
- Search Console + Bing Webmaster claim (search.google.com / bing.com)
- Founder role SQL assignment after first signup
- Native universal-link placeholders in `public/.well-known/` (TEAM_ID, SHA256)
- Supabase secret rotation

See `docs/LAUNCH_READINESS_2026-05-05.md` §4 for the full user-action list with copy-paste commands.
