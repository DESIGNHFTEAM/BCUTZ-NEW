# BCUTZ Route Map

> Single source of truth for all application routes, access control, and layouts.
> Derived from `src/config/routes.ts`. Enforced by `RouteGuard`.

Last updated: 2026-04-05

## Route Legend

| Symbol | Meaning |
|--------|---------|
| 🔓 | Public (no auth) |
| 🔒 | Auth required |
| 👤 | Customer role |
| ✂️ | Barber role |
| 🛡️ | Admin role |
| 👑 | Founder role |

---

## Public Pages 🔓

| Path | Layout | Nav Visible | Notes |
|------|--------|-------------|-------|
| `/` | public | yes | Landing page |
| `/about` | public | yes | |
| `/contact` | public | yes | |
| `/careers` | public | yes | |
| `/press` | public | yes | |
| `/pricing` | public | yes | |
| `/how-it-works` | public | yes | |
| `/for-professionals` | public | yes | |
| `/install` | public | yes | PWA install guide |
| `/terms` | public | yes | |
| `/privacy` | public | yes | |
| `/cookies` | public | yes | |
| `/barbers` | public | yes | Browse barbers |
| `/barber/:id` | public | yes | Barber profile |

## Auth Pages 🔓 (minimal layout)

| Path | Layout | Nav Visible | Notes |
|------|--------|-------------|-------|
| `/auth` | minimal | no | Sign in/up with returnTo support |
| `/verify-email` | minimal | no | |
| `/reset-password` | minimal | no | |

## Customer Pages 🔒👤

| Path | Layout | Nav Visible | Notes |
|------|--------|-------------|-------|
| `/bookings` | customer | yes | Requires auth |
| `/profile` | customer | yes | |
| `/loyalty` | customer | yes | |
| `/payment-success` | customer | yes | |
| `/settings/payment-methods` | customer | yes | |
| `/settings/notifications` | customer | yes | |
| `/settings/language-region` | customer | yes | |
| `/settings/saved-barbers` | customer | yes | |
| `/settings/2fa` | customer | yes | |

## Barber Pages 🔒✂️

| Path | Layout | Nav Visible | Notes |
|------|--------|-------------|-------|
| `/barber-onboarding` | minimal | no | Auth required, any role |
| `/dashboard` | barber | yes | Barber role required |
| `/dashboard/profile` | barber | yes | |
| `/dashboard/services` | barber | yes | |
| `/dashboard/calendar` | barber | yes | |
| `/dashboard/earnings` | barber | yes | |
| `/dashboard/analytics` | barber | yes | |
| `/dashboard/customers` | barber | yes | |
| `/dashboard/reviews` | barber | yes | |
| `/dashboard/messages` | barber | yes | |

## Admin Pages 🔒🛡️

| Path | Layout | Nav Visible | Notes |
|------|--------|-------------|-------|
| `/admin/barber-verification` | admin | no | Admin or founder |
| `/admin/reports` | admin | no | Admin or founder |
| `/admin/loyalty-rewards` | admin | no | Admin or founder |

## Founder Pages 🔒👑

| Path | Layout | Nav Visible | Notes |
|------|--------|-------------|-------|
| `/founder/dashboard` | founder | no | Founder only |
| `/founder/admin-management` | founder | no | Founder only |
| `/founder/activity-log` | founder | no | Founder only |
| `/founder/email-preview` | founder | no | Founder only |

## Special Pages

| Path | Layout | Nav Visible | Notes |
|------|--------|-------------|-------|
| `/unauthorized` | minimal | no | Shown when role check fails |
| `/screenshot-mockups` | public | no | Internal tool |
| `*` | public | yes | 404 Not Found |

---

## Auth Flow

1. Unauthenticated user visits protected route → redirected to `/auth?returnTo=<encoded-path>`
2. `returnTo` validated by `isSafeInternalReturnTo()` — must be internal path matching a known route
3. After login, `isReturnToAllowedForRoles()` checks the user can access the target
4. If invalid or cross-role, falls back to role-based default:
   - Founder → `/founder/dashboard`
   - Admin → `/admin/barber-verification`
   - Barber → `/dashboard`
   - Customer → `/bookings`

## Localized Routes

Language prefixes (`/de`, `/fr`, `/it`) are generated automatically for all routes. English (`/en`) uses the bare path.

## Layout Architecture

Layouts are defined in `src/components/layouts/LayoutRouter.tsx`. Pages never import `<Navbar />` or `<Footer />` directly — these are provided by the layout shell based on route config.

| Layout | Navbar | Footer |
|--------|--------|--------|
| `public` | ✅ | ✅ |
| `customer` | ✅ | ✅ |
| `barber` | ✅ | ❌ |
| `admin` | ✅ | ❌ |
| `founder` | ✅ | ❌ |
| `minimal` | ❌ | ❌ |
