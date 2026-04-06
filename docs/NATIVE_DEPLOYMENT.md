# BCUTZ — Native Mobile Deployment Guide

> Complete guide to building, signing, and publishing BCUTZ to the Apple App Store and Google Play Store.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Project Setup](#project-setup)
4. [iOS Deployment](#ios-deployment)
5. [Android Deployment](#android-deployment)
6. [App Icon & Splash Generation](#app-icon--splash-generation)
7. [Environment Configuration](#environment-configuration)
8. [CI/CD with GitHub Actions](#cicd-with-github-actions)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | ≥ 18 | Build toolchain |
| Bun | ≥ 1.0 | Package manager |
| Xcode | ≥ 15 | iOS builds (macOS only) |
| Android Studio | ≥ Hedgehog | Android builds |
| CocoaPods | ≥ 1.14 | iOS dependency manager |
| Java JDK | 17 | Android Gradle |

**Accounts required:**
- [Apple Developer Program](https://developer.apple.com/programs/) ($99/year)
- [Google Play Console](https://play.google.com/console/) ($25 one-time)

---

## Quick Start

```bash
# 1. Clone the repo
git clone <your-github-repo-url>
cd bcutz

# 2. Install dependencies
bun install

# 3. Build & sync to native platforms
chmod +x scripts/build-native.sh
./scripts/build-native.sh

# 4. Open in IDE
npx cap open ios      # Opens Xcode
npx cap open android  # Opens Android Studio
```

---

## Project Setup

### App Identity

| Field | Value |
|-------|-------|
| **App ID (Bundle ID)** | `com.bcutz.app` |
| **App Name** | BCUTZ |
| **Display Name** | BCUTZ - Book Your Perfect Cut |
| **Version** | Set in Xcode / build.gradle |

### Development vs Production

The Capacitor config automatically switches between dev and prod:

```bash
# Development (live-reload from Lovable preview)
CAPACITOR_ENV=development npx cap run ios

# Production (bundled local assets — for store builds)
bun run build && npx cap sync
npx cap open ios   # Archive from Xcode
```

> **CRITICAL:** Never submit a build with `CAPACITOR_ENV=development`. The build script ensures this automatically.

---

## iOS Deployment

### 1. Configure Signing

1. Open Xcode: `npx cap open ios`
2. Select **App** target → **Signing & Capabilities**
3. Set **Team** to your Apple Developer account
4. Set **Bundle Identifier** to `com.bcutz.app`
5. Enable **Automatically manage signing**

### 2. Add Capabilities

In Xcode → **Signing & Capabilities** → **+ Capability**:

| Capability | Purpose |
|------------|---------|
| Push Notifications | Booking reminders |
| Associated Domains | Universal Links (`applinks:bcutz.lovable.app`) |
| Background Modes | Remote notifications |

### 3. Configure Info.plist

Add these keys to `ios/App/App/Info.plist`:

```xml
<!-- Location (for nearby barbers) -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>BCUTZ uses your location to find barbers near you.</string>

<!-- Camera (for profile photos) -->
<key>NSCameraUsageDescription</key>
<string>BCUTZ needs camera access to take profile photos.</string>

<!-- Photo Library -->
<key>NSPhotoLibraryUsageDescription</key>
<string>BCUTZ needs photo library access to upload images.</string>

<!-- App Transport Security (production) -->
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
    <key>NSExceptionDomains</key>
    <dict>
        <key>supabase.co</key>
        <dict>
            <key>NSIncludesSubdomains</key>
            <true/>
            <key>NSExceptionAllowsInsecureHTTPLoads</key>
            <false/>
            <key>NSExceptionMinimumTLSVersion</key>
            <string>TLSv1.2</string>
        </dict>
    </dict>
</dict>
```

### 4. Build & Archive

```bash
# Build web assets
bun run build

# Sync to iOS
npx cap sync ios

# Open Xcode
npx cap open ios
```

In Xcode:
1. Select **Any iOS Device (arm64)** as build target
2. **Product → Archive**
3. When archive completes → **Distribute App**
4. Choose **App Store Connect** → **Upload**
5. Follow prompts to complete upload

### 5. Submit on App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create a new app with bundle ID `com.bcutz.app`
3. Fill in listing details from `docs/APP_STORE_LISTING.md`
4. Upload screenshots (see `docs/APP_STORE_LISTING.md` for sizes)
5. Add the archived build
6. Submit for review

---

## Android Deployment

### 1. Create Signing Key

```bash
# Generate a release keystore (keep this safe!)
keytool -genkey -v \
  -keystore bcutz-release.keystore \
  -alias bcutz \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass YOUR_STORE_PASSWORD \
  -keypass YOUR_KEY_PASSWORD \
  -dname "CN=BCUTZ,O=BCUTZ Team,L=Zurich,ST=Zurich,C=CH"
```

> ⚠️ **NEVER commit the keystore to Git.** Store it securely and back it up.

### 2. Configure Signing in Gradle

Edit `android/app/build.gradle`:

```groovy
android {
    compileSdkVersion rootProject.ext.compileSdkVersion

    defaultConfig {
        applicationId "com.bcutz.app"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "1.0.0"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
        aaptOptions {
             ignoreAssetsPattern '!.svn:!.git:!.ds_store:!*.scc:.*:<dir>_*:!CVS:!thumbs.db:!picasa.ini:!*~'
        }
    }

    signingConfigs {
        release {
            storeFile file("../../bcutz-release.keystore")
            storePassword System.getenv("BCUTZ_STORE_PASSWORD") ?: ""
            keyAlias "bcutz"
            keyPassword System.getenv("BCUTZ_KEY_PASSWORD") ?: ""
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 3. Update Version

In `android/app/build.gradle`:

```groovy
android {
    defaultConfig {
        versionCode 1        // Increment for each upload
        versionName "1.0.0"  // Semantic version
    }
}
```

### 4. Build Release AAB

```bash
# Build web assets
bun run build

# Sync to Android
npx cap sync android

# Build signed Android App Bundle
cd android
./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### 5. Submit to Google Play

1. Go to [Google Play Console](https://play.google.com/console)
2. Create a new app
3. Fill in listing details from `docs/APP_STORE_LISTING.md`
4. Upload the `.aab` file to **Production** track
5. Complete content rating questionnaire
6. Set pricing (Free)
7. Submit for review

---

## App Icon & Splash Generation

```bash
# Install the Capacitor assets tool
bun add -d @capacitor/assets

# Create resources directory
mkdir -p resources

# Place your source images:
#   resources/icon.png       — 1024×1024 app icon
#   resources/splash.png     — 2732×2732 splash screen
#   resources/icon-only.png  — 1024×1024 (no background, for adaptive icons)

# Generate all platform icons automatically
npx capacitor-assets generate

# Sync generated assets
npx cap sync
```

See `docs/APP_ICONS_GUIDE.md` for detailed icon specifications.

---

## Environment Configuration

### Supabase Connection

The app connects to the backend via environment variables baked into the build:

| Variable | Source |
|----------|--------|
| `VITE_SUPABASE_URL` | `.env.example` template (auto-configured by Lovable Cloud) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env.example` template (auto-configured by Lovable Cloud) |

These are **public/anon keys** and safe to include in the app bundle.

### Push Notifications

#### iOS (APNs)
1. Create an APNs key in [Apple Developer Portal](https://developer.apple.com/account/resources/authkeys/)
2. Download the `.p8` file
3. Configure in your push notification service

#### Android (FCM)
1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Add your Android app (`com.bcutz.app`)
3. Download `google-services.json` → place in `android/app/`
4. The `FIREBASE_SERVICE_ACCOUNT_KEY` secret is already configured in the backend

---

## CI/CD with GitHub Actions

Create `.github/workflows/build-native.yml`:

```yaml
name: Build Native Apps

on:
  push:
    tags:
      - 'v*'

jobs:
  build-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run build
      - uses: actions/upload-artifact@v4
        with:
          name: web-dist
          path: dist/

  build-android:
    needs: build-web
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - uses: actions/setup-java@v4
        with:
          java-version: 17
          distribution: temurin
      - uses: actions/download-artifact@v4
        with:
          name: web-dist
          path: dist/
      - run: bun install --frozen-lockfile
      - run: npx cap sync android
      - name: Build AAB
        working-directory: android
        run: ./gradlew bundleRelease
        env:
          BCUTZ_STORE_PASSWORD: ${{ secrets.ANDROID_STORE_PASSWORD }}
          BCUTZ_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
      - uses: actions/upload-artifact@v4
        with:
          name: android-aab
          path: android/app/build/outputs/bundle/release/*.aab

  build-ios:
    needs: build-web
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - uses: actions/download-artifact@v4
        with:
          name: web-dist
          path: dist/
      - run: bun install --frozen-lockfile
      - run: npx cap sync ios
      - name: Build iOS Archive
        working-directory: ios/App
        run: |
          xcodebuild archive \
            -workspace App.xcworkspace \
            -scheme App \
            -archivePath build/BCUTZ.xcarchive \
            -configuration Release \
            CODE_SIGN_IDENTITY="${{ secrets.IOS_CODE_SIGN_IDENTITY }}" \
            DEVELOPMENT_TEAM="${{ secrets.IOS_TEAM_ID }}"
```

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `ANDROID_STORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_PASSWORD` | Key alias password |
| `IOS_CODE_SIGN_IDENTITY` | e.g. "Apple Distribution" |
| `IOS_TEAM_ID` | Your Apple Developer Team ID |

---

## Troubleshooting

### "White screen" on device
- Ensure `bun run build` was run before `npx cap sync`
- Check that `CAPACITOR_ENV` is NOT set to `development`
- Verify `dist/index.html` exists

### iOS build fails with signing error
- Open Xcode → select correct signing team
- Ensure bundle ID matches `com.bcutz.app`
- Check Apple Developer membership is active

### Android "minSdkVersion" error
- Edit `android/variables.gradle`: set `minSdkVersion = 22`

### Push notifications not working
- iOS: Verify APNs key is configured
- Android: Verify `google-services.json` is in `android/app/`
- Both: Ensure the app has notification permissions

### Deep links not working
- iOS: Verify Associated Domains capability is added
- Android: Verify `assetlinks.json` is accessible at `https://bcutz.lovable.app/.well-known/assetlinks.json`

---

## Release Checklist

Run the automated checklist:

```bash
chmod +x scripts/prepare-store-release.sh
./scripts/prepare-store-release.sh
```

### Manual Checks

- [ ] App ID is `com.bcutz.app` (not the Lovable default)
- [ ] No dev server URL in production build
- [ ] All app icons generated for both platforms
- [ ] Splash screen configured
- [ ] Push notifications tested on real device
- [ ] Deep links tested
- [ ] Privacy policy URL accessible
- [ ] App Store listing content ready (`docs/APP_STORE_LISTING.md`)
- [ ] Screenshots captured for all required device sizes
- [ ] Version number incremented from last release
- [ ] Release keystore backed up securely (Android)
