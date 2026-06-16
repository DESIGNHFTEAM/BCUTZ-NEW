#!/usr/bin/env python3
"""Generate the App Store / iOS AppIcon from the brand master.

Source: resources/appicon-master.png  (the "Bcutz" wordmark, full-bleed black).

App Store + iOS icon rules this satisfies:
- 1024x1024, flattened, NO alpha channel.
- NO pre-rounded corners: the master is already a full-bleed black square, so iOS
  applies its own corner mask cleanly (no white nubs).

Modern Xcode (14+) derives every required icon size from this single 1024 asset
(Contents.json uses the universal single-size format), so no multi-size export.

Usage:  python3 scripts/make-appicon.py
Requires: Pillow  (pip install Pillow)
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MASTER = ROOT / "resources" / "appicon-master.png"
ICON = ROOT / "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"
MARKETING = ROOT / "resources" / "appstore-icon-1024.png"


def main() -> None:
    im = Image.open(MASTER).convert("RGB")  # convert drops any alpha
    im = im.resize((1024, 1024), Image.LANCZOS)
    ICON.parent.mkdir(parents=True, exist_ok=True)
    im.save(ICON, format="PNG")
    im.save(MARKETING, format="PNG")
    print(f"wrote {ICON}")
    print(f"wrote {MARKETING}")


if __name__ == "__main__":
    main()
