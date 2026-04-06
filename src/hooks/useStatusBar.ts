import { useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

/**
 * Hook for managing native status bar appearance
 */
export function useStatusBar() {
  const isNative = Capacitor.isNativePlatform();

  /**
   * Set status bar to dark content (for light backgrounds)
   */
  const setDarkContent = useCallback(async () => {
    if (!isNative) return;
    try {
      await StatusBar.setStyle({ style: Style.Dark });
    } catch (error) {
      console.log('[StatusBar] setStyle not available');
    }
  }, [isNative]);

  /**
   * Set status bar to light content (for dark backgrounds)
   */
  const setLightContent = useCallback(async () => {
    if (!isNative) return;
    try {
      await StatusBar.setStyle({ style: Style.Light });
    } catch (error) {
      console.log('[StatusBar] setStyle not available');
    }
  }, [isNative]);

  /**
   * Set status bar background color (Android only)
   */
  const setBackgroundColor = useCallback(async (color: string) => {
    if (!isNative || Capacitor.getPlatform() !== 'android') return;
    try {
      await StatusBar.setBackgroundColor({ color });
    } catch (error) {
      console.log('[StatusBar] setBackgroundColor not available');
    }
  }, [isNative]);

  /**
   * Hide status bar
   */
  const hide = useCallback(async () => {
    if (!isNative) return;
    try {
      await StatusBar.hide();
    } catch (error) {
      console.log('[StatusBar] hide not available');
    }
  }, [isNative]);

  /**
   * Show status bar
   */
  const show = useCallback(async () => {
    if (!isNative) return;
    try {
      await StatusBar.show();
    } catch (error) {
      console.log('[StatusBar] show not available');
    }
  }, [isNative]);

  /**
   * Set overlay mode (content can appear under status bar)
   */
  const setOverlaysWebView = useCallback(async (overlay: boolean) => {
    if (!isNative) return;
    try {
      await StatusBar.setOverlaysWebView({ overlay });
    } catch (error) {
      console.log('[StatusBar] setOverlaysWebView not available');
    }
  }, [isNative]);

  return {
    isNative,
    setDarkContent,
    setLightContent,
    setBackgroundColor,
    hide,
    show,
    setOverlaysWebView,
  };
}

/**
 * Hook to automatically sync status bar with theme
 */
export function useStatusBarThemeSync(isDarkMode: boolean) {
  const { setDarkContent, setLightContent, setBackgroundColor, isNative } = useStatusBar();

  useEffect(() => {
    if (!isNative) return;

    if (isDarkMode) {
      // Dark mode: light status bar content, dark background
      setLightContent();
      setBackgroundColor('#0a0a0a');
    } else {
      // Light mode: dark status bar content, light background
      setDarkContent();
      setBackgroundColor('#ffffff');
    }
  }, [isDarkMode, isNative, setDarkContent, setLightContent, setBackgroundColor]);
}

export default useStatusBar;
