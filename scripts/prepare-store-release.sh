#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════
# BCUTZ — Store Release Preparation
# Validates that everything is ready for App Store / Play Store.
# ═══════════════════════════════════════════════════════════════════

BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
NC="\033[0m"

pass=0
fail=0

check() {
  if eval "$2" >/dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} $1"
    ((pass++))
  else
    echo -e "  ${RED}✗${NC} $1"
    ((fail++))
  fi
}

echo -e "\n${BOLD}═══ BCUTZ Store Release Checklist ═══${NC}\n"

# ─── Web Build ────────────────────────────────────────────────────
echo -e "${BOLD}Web Build${NC}"
check "dist/ exists"                    "[ -d dist ]"
check "index.html in dist"             "[ -f dist/index.html ]"
check "Service worker generated"        "[ -f dist/sw.js ]"
check "Bundle size < 5 MB"             "[ $(du -sk dist | cut -f1) -lt 5120 ]"

# ─── Capacitor ────────────────────────────────────────────────────
echo -e "\n${BOLD}Capacitor Config${NC}"
check "capacitor.config.ts exists"      "[ -f capacitor.config.ts ]"
check "App ID is com.bcutz.app"         "grep -q 'com.bcutz.app' capacitor.config.ts"
check "No dev server URL in prod"       "! grep -q 'lovableproject.com' dist/index.html"

# ─── iOS ──────────────────────────────────────────────────────────
echo -e "\n${BOLD}iOS${NC}"
if [ -d "ios" ]; then
  check "iOS project exists"             "[ -d ios/App ]"
  check "Info.plist present"             "[ -f ios/App/App/Info.plist ]"
  check "Assets.xcassets present"        "[ -d ios/App/App/Assets.xcassets ]"
else
  echo -e "  ${YELLOW}⊘${NC} iOS platform not added yet (run: npx cap add ios)"
fi

# ─── Android ──────────────────────────────────────────────────────
echo -e "\n${BOLD}Android${NC}"
if [ -d "android" ]; then
  check "Android project exists"         "[ -d android/app ]"
  check "build.gradle present"           "[ -f android/app/build.gradle ]"
  check "AndroidManifest.xml present"    "[ -f android/app/src/main/AndroidManifest.xml ]"
else
  echo -e "  ${YELLOW}⊘${NC} Android platform not added yet (run: npx cap add android)"
fi

# ─── Assets ───────────────────────────────────────────────────────
echo -e "\n${BOLD}PWA & App Icons${NC}"
check "PWA 192px icon"                  "[ -f public/pwa-192x192.png ]"
check "PWA 512px icon"                  "[ -f public/pwa-512x512.png ]"
check "Apple touch icon"                "[ -f public/apple-touch-icon.png ]"
check "Favicon"                         "[ -f public/favicon.svg ]"
check "manifest.webmanifest generated"  "[ -f dist/manifest.webmanifest ] || [ -f public/manifest.webmanifest ]"

# ─── Deep Links / Universal Links ─────────────────────────────────
echo -e "\n${BOLD}Deep Links${NC}"
check "apple-app-site-association"      "[ -f public/.well-known/apple-app-site-association ]"
check "assetlinks.json"                 "[ -f public/.well-known/assetlinks.json ]"

# ─── Summary ──────────────────────────────────────────────────────
echo -e "\n${BOLD}───────────────────────────${NC}"
total=$((pass + fail))
echo -e "  ${GREEN}${pass}${NC} passed, ${RED}${fail}${NC} failed (${total} total)"

if [ "$fail" -gt 0 ]; then
  echo -e "\n  ${YELLOW}Fix the failing checks before submitting to stores.${NC}\n"
  exit 1
else
  echo -e "\n  ${GREEN}All checks passed — ready for store submission! 🚀${NC}\n"
fi
