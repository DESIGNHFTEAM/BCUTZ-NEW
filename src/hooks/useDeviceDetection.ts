import { useState, useEffect } from 'react';

export type DeviceType = 'ios' | 'android' | 'desktop' | 'unknown';
export type BrowserType = 'safari' | 'chrome' | 'firefox' | 'edge' | 'samsung' | 'other';

interface DeviceInfo {
  deviceType: DeviceType;
  browserType: BrowserType;
  isStandalone: boolean;
  canInstallPWA: boolean;
  isMobile: boolean;
}

export function useDeviceDetection(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    deviceType: 'unknown',
    browserType: 'other',
    isStandalone: false,
    canInstallPWA: false,
    isMobile: false,
  });

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform?.toLowerCase() || '';

    // Detect device type
    let deviceType: DeviceType = 'desktop';
    if (/iphone|ipad|ipod/.test(userAgent) || /mac/.test(platform) && navigator.maxTouchPoints > 1) {
      deviceType = 'ios';
    } else if (/android/.test(userAgent)) {
      deviceType = 'android';
    }

    // Detect browser type
    let browserType: BrowserType = 'other';
    if (/safari/.test(userAgent) && !/chrome/.test(userAgent) && !/chromium/.test(userAgent)) {
      browserType = 'safari';
    } else if (/samsungbrowser/.test(userAgent)) {
      browserType = 'samsung';
    } else if (/edg/.test(userAgent)) {
      browserType = 'edge';
    } else if (/chrome/.test(userAgent)) {
      browserType = 'chrome';
    } else if (/firefox/.test(userAgent)) {
      browserType = 'firefox';
    }

    // Check if running as standalone PWA
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    // Check if PWA can be installed
    const canInstallPWA = 'serviceWorker' in navigator && !isStandalone;

    // Check if mobile
    const isMobile = deviceType === 'ios' || deviceType === 'android';

    setDeviceInfo({
      deviceType,
      browserType,
      isStandalone,
      canInstallPWA,
      isMobile,
    });
  }, []);

  return deviceInfo;
}
