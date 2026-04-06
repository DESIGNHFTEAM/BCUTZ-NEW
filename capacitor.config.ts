import type { CapacitorConfig } from '@capacitor/cli';

/**
 * BCUTZ Capacitor Configuration
 * 
 * IMPORTANT: For production App Store / Play Store builds:
 * 1. Remove or comment out the `server.url` block below
 * 2. Run `npm run build && npx cap sync` to bundle the web app locally
 * 3. The app will then load from the local `dist/` folder (offline-capable)
 * 
 * The `server.url` is ONLY for live-reload development against the Lovable preview.
 */

const isDev = process.env.CAPACITOR_ENV === 'development';

const config: CapacitorConfig = {
  appId: 'com.bcutz.app',
  appName: 'BCUTZ',
  webDir: 'dist',

  // ──── Dev-only: live-reload from Lovable preview ────
  // Remove this entire `server` block for production / store builds
  ...(isDev
    ? {
        server: {
          url: 'https://6f56399f-41e6-40a9-8ad0-b7cfdae000d0.lovableproject.com?forceHideBadge=true',
          cleartext: true,
        },
      }
    : {}),

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: false,
      launchFadeOutDuration: 300,
      backgroundColor: '#0a0a0a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a0a',
      overlaysWebView: false,
    },
  },

  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'bcutz',
    // Xcode → Signing & Capabilities → Associated Domains:
    //   applinks:bcutz.lovable.app
    //   webcredentials:bcutz.lovable.app
  },

  android: {
    allowMixedContent: false,       // strict in production
    captureInput: true,
    webContentsDebuggingEnabled: isDev,
    // App Links: add intent-filter in AndroidManifest.xml
    // Verify via /.well-known/assetlinks.json
  },
};

export default config;
