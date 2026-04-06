import { useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';

/**
 * Hook for managing native splash screen
 */
export function useSplashScreen() {
  const isNative = Capacitor.isNativePlatform();

  /**
   * Hide the splash screen
   */
  const hide = useCallback(async (fadeOutDuration: number = 300) => {
    if (!isNative) return;
    try {
      await SplashScreen.hide({ fadeOutDuration });
    } catch (error) {
      console.log('[SplashScreen] hide not available');
    }
  }, [isNative]);

  /**
   * Show the splash screen
   */
  const show = useCallback(async (options?: {
    autoHide?: boolean;
    fadeInDuration?: number;
    fadeOutDuration?: number;
    showDuration?: number;
  }) => {
    if (!isNative) return;
    try {
      await SplashScreen.show(options);
    } catch (error) {
      console.log('[SplashScreen] show not available');
    }
  }, [isNative]);

  return {
    isNative,
    hide,
    show,
  };
}

/**
 * Hook to auto-hide splash screen when app is ready
 */
export function useAutoHideSplash(isReady: boolean = true, delay: number = 500) {
  const { hide, isNative } = useSplashScreen();

  useEffect(() => {
    if (!isNative || !isReady) return;

    const timer = setTimeout(() => {
      hide();
    }, delay);

    return () => clearTimeout(timer);
  }, [isReady, delay, hide, isNative]);
}

export default useSplashScreen;
