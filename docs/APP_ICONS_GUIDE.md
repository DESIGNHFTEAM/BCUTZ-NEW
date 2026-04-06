# BCUTZ App Icons Generation Guide

This guide explains how to generate all required app icons for iOS App Store and Google Play Store submission.

## Source Logo

Use the BCUTZ logo from: `src/assets/cutz-logo.svg`

The logo is a white vector design that should be placed on the app's dark background color (`#0a0a0a`).

---

## iOS App Icons

### Required Sizes (1024x1024 master, then export all)

| Size | Filename | Purpose |
|------|----------|---------|
| 1024 x 1024 | `AppIcon@1024.png` | App Store |
| 180 x 180 | `AppIcon@3x.png` | iPhone (@3x) |
| 167 x 167 | `AppIcon@iPad-Pro.png` | iPad Pro (@2x) |
| 152 x 152 | `AppIcon@iPad.png` | iPad (@2x) |
| 120 x 120 | `AppIcon@2x.png` | iPhone (@2x) |
| 87 x 87 | `Spotlight@3x.png` | Spotlight iPhone (@3x) |
| 80 x 80 | `Spotlight@iPad.png` | Spotlight iPad (@2x) |
| 76 x 76 | `AppIcon@iPad-1x.png` | iPad (@1x) |
| 60 x 60 | `AppIcon@1x.png` | iPhone (@1x) |
| 58 x 58 | `Settings@2x.png` | Settings iPhone (@2x) |
| 40 x 40 | `Spotlight@1x.png` | Spotlight (@1x) |
| 29 x 29 | `Settings@1x.png` | Settings (@1x) |
| 20 x 20 | `Notification@1x.png` | Notification (@1x) |

### iOS Icon Guidelines
- No transparency allowed
- No rounded corners (iOS adds them automatically)
- Use background color: `#0a0a0a`
- Logo should occupy ~60-70% of the icon area
- Center the logo both horizontally and vertically

### Location in Xcode Project
```
ios/App/App/Assets.xcassets/AppIcon.appiconset/
```

---

## Android App Icons

### Standard Icons (Launcher)

| Density | Size | Filename |
|---------|------|----------|
| xxxhdpi | 192 x 192 | `ic_launcher.png` |
| xxhdpi | 144 x 144 | `ic_launcher.png` |
| xhdpi | 96 x 96 | `ic_launcher.png` |
| hdpi | 72 x 72 | `ic_launcher.png` |
| mdpi | 48 x 48 | `ic_launcher.png` |

### Adaptive Icons (Android 8.0+)

Adaptive icons consist of two layers:

#### Foreground Layer (432 x 432)
- Contains the logo
- Must have 66dp safe zone from edges
- The visible area is a 66dp circle in the center
- Logo should fit within the safe zone

#### Background Layer (432 x 432)
- Solid color or gradient
- Use: `#0a0a0a` (app dark background)

### Location in Android Project
```
android/app/src/main/res/
├── mipmap-mdpi/
│   └── ic_launcher.png (48x48)
├── mipmap-hdpi/
│   └── ic_launcher.png (72x72)
├── mipmap-xhdpi/
│   └── ic_launcher.png (96x96)
├── mipmap-xxhdpi/
│   └── ic_launcher.png (144x144)
├── mipmap-xxxhdpi/
│   └── ic_launcher.png (192x192)
├── mipmap-anydpi-v26/
│   └── ic_launcher.xml (adaptive icon config)
├── drawable/
│   ├── ic_launcher_foreground.xml (vector foreground)
│   └── ic_launcher_background.xml (background color)
```

### Adaptive Icon XML (`mipmap-anydpi-v26/ic_launcher.xml`)
```xml
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>
```

### Background Drawable (`drawable/ic_launcher_background.xml`)
```xml
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android">
    <solid android:color="#0a0a0a"/>
</shape>
```

---

## Play Store Icon

| Size | Purpose |
|------|---------|
| 512 x 512 | Play Store listing |

Must be:
- PNG format
- No transparency
- 32-bit color

---

## Splash Screen Assets

### iOS Splash Screen
Use Storyboard-based launch screen (recommended).

In `ios/App/App/Base.lproj/LaunchScreen.storyboard`, the app uses:
- Background color: `#0a0a0a`
- Centered logo image

### Android Splash Screen

| Density | Size | Location |
|---------|------|----------|
| mdpi | 320 x 480 | `res/drawable-mdpi/splash.png` |
| hdpi | 480 x 800 | `res/drawable-hdpi/splash.png` |
| xhdpi | 720 x 1280 | `res/drawable-xhdpi/splash.png` |
| xxhdpi | 1080 x 1920 | `res/drawable-xxhdpi/splash.png` |
| xxxhdpi | 1440 x 2560 | `res/drawable-xxxhdpi/splash.png` |

---

## Tools for Generation

### Option 1: Online Generators
- [AppIcon.co](https://appicon.co/) - Upload 1024x1024, exports all sizes
- [MakeAppIcon](https://makeappicon.com/) - Same functionality
- [EasyAppIcon](https://easyappicon.com/) - Also supports adaptive icons

### Option 2: Using Capacitor Assets (Recommended)
```bash
bun add -d @capacitor/assets
npx capacitor-assets generate
```

Create a source icon at:
- `resources/icon.png` (1024x1024)
- `resources/splash.png` (2732x2732)

### Option 3: Manual with Image Editor
1. Create 1024x1024 PNG with:
   - Background: `#0a0a0a`
   - Logo: White BCUTZ logo centered
   - Logo occupies ~60% of the space
2. Export at all required sizes

---

## Current Assets Status

### Available in Project
- `public/pwa-192x192.png` - PWA icon 192px
- `public/pwa-512x512.png` - PWA icon 512px
- `public/apple-touch-icon.png` - iOS web app icon
- `public/favicon.svg` - Favicon
- `src/assets/cutz-logo.svg` - Source logo vector
- `src/assets/app-icon-1024.png` - 1024px master icon
- `src/assets/splash-screen.png` - Splash screen

### To Generate After Export
After exporting to GitHub and running `npx cap add ios/android`:

1. Generate iOS icons in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
2. Generate Android icons in `android/app/src/main/res/mipmap-*/`
3. Create adaptive icon XML files for Android
4. Update splash screen images

---

## Quick Start Commands

```bash
# 1. Export project to GitHub
# 2. Clone locally and install
git clone [your-repo]
cd bcutz
bun install

# 3. Add platforms
npx cap add ios
npx cap add android

# 4. Install assets generator
bun add -d @capacitor/assets

# 5. Create resources folder and add source images
mkdir resources
# Copy your 1024x1024 icon to resources/icon.png
# Copy your 2732x2732 splash to resources/splash.png

# 6. Generate all icons
npx capacitor-assets generate

# 7. Sync with native projects
npx cap sync
```

---

## Verification Checklist

### iOS
- [ ] All icon sizes present in `AppIcon.appiconset`
- [ ] `Contents.json` updated with all filenames
- [ ] No alpha channel/transparency in icons
- [ ] 1024x1024 App Store icon included

### Android
- [ ] All mipmap densities have icons
- [ ] Adaptive icon XML configured
- [ ] Foreground has proper safe zone
- [ ] Play Store 512x512 icon ready

### Store Submission
- [ ] iOS: App Store icon 1024x1024
- [ ] Android: Play Store icon 512x512
- [ ] Feature graphic 1024x500 (Play Store)
