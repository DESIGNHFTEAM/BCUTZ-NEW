# BCUTZ Security Checklist

Last updated: 2026-04-05

## Environment & Secrets

- [x] `.env` is listed in `.gitignore` (manual step — verify locally)
- [x] `.env.example` exists with placeholder public keys only
- [x] No secrets committed to repository
- [x] All private keys stored as Lovable Cloud secrets (STRIPE_SECRET_KEY, SMTP_*, etc.)
- [x] Client-side code only uses `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`

## Authentication & Authorization

- [x] Roles stored in `user_roles` table (not on profiles)
- [x] `has_role()` and `is_founder()` are SECURITY DEFINER functions (bypass RLS safely)
- [x] Route guards enforce auth + role requirements centrally via `RouteGuard`
- [x] No redundant `ProtectedRoute` wrappers in individual pages
- [x] Admin/founder routes are never visible in public or guest navigation
- [x] `returnTo` parameter validated via `isSafeInternalReturnTo()` — rejects external URLs, protocol-relative paths, and unknown routes
- [x] Post-login redirects respect role permissions via `isReturnToAllowedForRoles()`
- [x] Rate limiting on login/signup attempts

## Row-Level Security (RLS)

- [x] RLS enabled on all tables
- [x] `barber_profiles` — owners and admins/founders can read; only owners can update their own
- [x] `bookings` — customers see own; barbers see their shop's; no public access
- [x] `profiles` — users see own; barbers see customers with recent bookings (90-day window)
- [x] `user_roles` — users see own; admins/founders see all; no client-side INSERT/UPDATE/DELETE
- [x] `loyalty_points` — UPDATE/DELETE blocked for all clients (service role only)
- [x] `loyalty_transactions` — INSERT blocked for all clients (service role only)
- [x] `payments` — SELECT only for booking participants; no client-side mutations
- [x] `payouts` — barbers can view own; no client-side mutations
- [x] `admin_activity_log` — admins/founders can insert; only founders can view
- [x] `founder_settings` — founders can view/update own only

## Stripe Integration

- [x] Webhook signature verified via `stripe.webhooks.constructEventAsync()` — no fallback
- [x] `STRIPE_WEBHOOK_SECRET` required — function returns 500 if missing
- [x] Missing `stripe-signature` header returns 400
- [x] **Idempotency**: Duplicate `checkout.session.completed` events rejected by checking `provider_transaction_id`
- [x] **Voucher race condition fixed**: Vouchers reserved at checkout, finalized only after payment confirmation in webhook
- [x] Booking price validated server-side via `validate_booking_price()` trigger — client-submitted prices overridden
- [x] Checkout input validated with Zod schema
- [x] Payout input validated with Zod schema
- [x] Barber Connect onboarding requires authenticated barber with active profile
- [x] Payout processing restricted to admin/founder roles
- [x] Sensitive data redacted from all edge function logs

## Booking Integrity

- [x] `check_booking_conflicts()` trigger prevents double-bookings (overlapping time slots)
- [x] Past-date bookings rejected at database level
- [x] Service-barber relationship validated in `validate_booking_price()` trigger
- [x] Inactive services/barbers rejected

## Data Protection

- [x] `barber_profiles_public` view excludes sensitive fields (bank info, phone, address)
- [x] PII access limited — barbers only see customer profiles with active/recent bookings
- [x] Booking comments visibility controlled per-user
- [x] Content length limits enforced on user-generated fields
- [x] Loyalty `redeem_loyalty_reward()` uses `SELECT ... FOR UPDATE` row locking to prevent race conditions

## Edge Function Security

- [x] All edge functions validate `Authorization` header
- [x] Service role key validated for admin-level operations (delete-user-account)
- [x] Input validated with Zod schemas in: checkout, account deletion, payout processing
- [x] Founder-only operations check `is_founder()` before proceeding
- [x] Account deletion protected: founders cannot be deleted; requires 6-digit email confirmation code

## Manual Verification Required

- [ ] Verify `.env` is not tracked in git (`git ls-files .env` should return empty)
- [ ] Verify only one lockfile exists (project uses bun)
- [ ] Run the database linter to check for RLS policy gaps
- [ ] Test webhook with Stripe CLI: `stripe trigger checkout.session.completed`
- [ ] Verify duplicate webhook events are properly rejected
