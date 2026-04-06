# BCUTZ — Book Your Perfect Cut ✂️

The modern way to find and book the best barbers near you. Premium haircuts, zero hassle.

**Live:** [bcutz.lovable.app](https://bcutz.lovable.app)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 · TypeScript · Vite 5 · Tailwind CSS |
| UI | shadcn/ui · Framer Motion · Recharts |
| Backend | Lovable Cloud (Supabase) — Postgres, Auth, Edge Functions, Storage |
| Payments | Stripe Connect |
| i18n | i18next (EN, DE, FR, IT) |
| Mobile | Capacitor (iOS + Android) · PWA |

---

## Getting Started

```bash
# Clone & install
git clone <YOUR_GIT_URL>
cd bcutz
cp .env.example .env   # fill in your values
bun install

# Start dev server
bun run dev
```

Open [http://localhost:8080](http://localhost:8080).

---

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── home/         # Landing page sections
│   ├── layout/       # Navbar, Footer
│   ├── seo/          # JSON-LD structured data
│   └── ui/           # shadcn/ui primitives
├── contexts/         # React contexts (Currency)
├── hooks/            # Custom hooks (auth, theme, device, etc.)
├── lib/              # Utilities (auth, i18n, fees, images)
├── locales/          # Translation files (en, de, fr, it)
├── pages/            # Route pages
│   ├── settings/     # User settings pages
│   └── ...
└── integrations/     # Supabase client & types (auto-generated)

supabase/
├── functions/        # Edge Functions (email, payments, notifications)
│   └── _shared/      # Shared utilities (SMTP, CORS, templates)
├── config.toml       # Supabase project config
└── migrations/       # Database migrations

scripts/
├── build-native.sh           # Build for iOS/Android
├── prepare-store-release.sh  # Pre-submission checklist
└── validate-translations.ts  # i18n validation

docs/
├── NATIVE_DEPLOYMENT.md      # Full native deploy guide
├── APP_STORE_LISTING.md      # Store listing content
├── APP_ICONS_GUIDE.md        # Icon generation guide
└── INTERNATIONAL_COMPLIANCE.md
```

---

## Native Mobile Builds

BCUTZ ships as a native iOS and Android app via Capacitor.

### Quick Build

```bash
# Production build + sync to native platforms
./scripts/build-native.sh

# Open in IDE
npx cap open ios      # Xcode
npx cap open android  # Android Studio
```

### Development (Live Reload)

```bash
CAPACITOR_ENV=development npx cap run ios
```

### Store Submission

See **[docs/NATIVE_DEPLOYMENT.md](docs/NATIVE_DEPLOYMENT.md)** for the complete guide covering:

- iOS signing & App Store submission
- Android keystore & Play Store submission
- CI/CD with GitHub Actions
- Push notification setup (APNs + FCM)

### Pre-Release Checklist

```bash
./scripts/prepare-store-release.sh
```

---

## Key Features

- 🔍 **Barber Discovery** — Browse verified barbers with real reviews
- 📅 **Instant Booking** — Real-time availability, one-tap booking
- 💳 **Secure Payments** — Stripe-powered with flat CHF 2.00 fee
- ⭐ **Reviews & Ratings** — Honest reviews from verified customers
- 🎁 **Loyalty Rewards** — Points, tiers (Bronze → Platinum), birthday bonuses
- 💬 **Real-time Chat** — Direct messaging between customers & barbers
- 🔔 **Push Notifications** — Booking reminders & updates
- 🌍 **Multi-language** — English, German, French, Italian
- 🌙 **Dark Mode** — Full dark/light theme support
- 📱 **PWA + Native** — Installable web app + App Store / Play Store

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values. **Never commit `.env` to git.**

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Backend API URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public anon key |
| `VITE_SUPABASE_PROJECT_ID` | Project identifier |

Edge function secrets (SMTP, Stripe, etc.) are managed via the backend secrets panel.

## Security

See **[docs/SECURITY_CHECKLIST.md](docs/SECURITY_CHECKLIST.md)** for the full pre-deploy security checklist.

---

## Deployment

### Web (Lovable)

Click **Publish** in the Lovable editor, or push to the GitHub `main` branch.

### Native (App Store / Play Store)

Follow **[docs/NATIVE_DEPLOYMENT.md](docs/NATIVE_DEPLOYMENT.md)**.

---

## License

Proprietary — © 2026 BCUTZ Team. All rights reserved.
