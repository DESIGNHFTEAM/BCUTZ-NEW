#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════
# BCUTZ — Native Build Script
# Builds the web app and syncs it into iOS / Android native projects.
# ═══════════════════════════════════════════════════════════════════

BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
NC="\033[0m"

info()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn()  { echo -e "${YELLOW}[!]${NC} $*"; }
error() { echo -e "${RED}[✗]${NC} $*"; exit 1; }

# ─── Pre-flight checks ───────────────────────────────────────────
command -v node  >/dev/null || error "Node.js is required"
command -v bun   >/dev/null || error "Bun is required (https://bun.sh)"

echo -e "\n${BOLD}═══ BCUTZ Native Build ═══${NC}\n"

# ─── 1. Install dependencies ─────────────────────────────────────
info "Installing dependencies…"
bun install --frozen-lockfile

# ─── 2. Ensure production Capacitor config ────────────────────────
# The capacitor.config.ts only enables the dev server when
# CAPACITOR_ENV=development, so a normal build is production-safe.
unset CAPACITOR_ENV 2>/dev/null || true

# ─── 3. Build web app ────────────────────────────────────────────
info "Building production web bundle…"
bun run build

# ─── 4. Add native platforms if missing ───────────────────────────
if [ ! -d "ios" ]; then
  warn "iOS platform not found — adding…"
  npx cap add ios
fi

if [ ! -d "android" ]; then
  warn "Android platform not found — adding…"
  npx cap add android
fi

# ─── 5. Sync web bundle → native projects ────────────────────────
info "Syncing to native platforms…"
npx cap sync

# ─── 6. Done ──────────────────────────────────────────────────────
echo ""
info "Build complete! Next steps:"
echo ""
echo "  iOS (requires macOS + Xcode 15+):"
echo "    npx cap open ios"
echo "    → Set signing team in Xcode"
echo "    → Product → Archive → Distribute to App Store"
echo ""
echo "  Android (requires Android Studio):"
echo "    npx cap open android"
echo "    → Build → Generate Signed Bundle (AAB)"
echo "    → Upload to Google Play Console"
echo ""
