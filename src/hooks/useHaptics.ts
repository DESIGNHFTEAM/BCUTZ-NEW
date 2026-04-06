import { useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Hook for haptic feedback on native devices
 * Gracefully degrades to no-op on web
 */
export function useHaptics() {
  const isNative = Capacitor.isNativePlatform();

  /**
   * Light impact - for subtle feedback like button hovers
   */
  const lightImpact = useCallback(async () => {
    if (!isNative) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (error) {
      console.log('[Haptics] Light impact not available');
    }
  }, [isNative]);

  /**
   * Medium impact - for standard button presses
   */
  const mediumImpact = useCallback(async () => {
    if (!isNative) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (error) {
      console.log('[Haptics] Medium impact not available');
    }
  }, [isNative]);

  /**
   * Heavy impact - for significant actions like confirming a booking
   */
  const heavyImpact = useCallback(async () => {
    if (!isNative) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (error) {
      console.log('[Haptics] Heavy impact not available');
    }
  }, [isNative]);

  /**
   * Selection feedback - for toggling switches, selecting options
   */
  const selectionFeedback = useCallback(async () => {
    if (!isNative) return;
    try {
      await Haptics.selectionStart();
      await Haptics.selectionChanged();
      await Haptics.selectionEnd();
    } catch (error) {
      console.log('[Haptics] Selection feedback not available');
    }
  }, [isNative]);

  /**
   * Success notification - for successful actions
   */
  const successNotification = useCallback(async () => {
    if (!isNative) return;
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch (error) {
      console.log('[Haptics] Success notification not available');
    }
  }, [isNative]);

  /**
   * Warning notification - for warnings
   */
  const warningNotification = useCallback(async () => {
    if (!isNative) return;
    try {
      await Haptics.notification({ type: NotificationType.Warning });
    } catch (error) {
      console.log('[Haptics] Warning notification not available');
    }
  }, [isNative]);

  /**
   * Error notification - for errors
   */
  const errorNotification = useCallback(async () => {
    if (!isNative) return;
    try {
      await Haptics.notification({ type: NotificationType.Error });
    } catch (error) {
      console.log('[Haptics] Error notification not available');
    }
  }, [isNative]);

  /**
   * Vibrate - for longer vibration patterns
   */
  const vibrate = useCallback(async (duration: number = 300) => {
    if (!isNative) return;
    try {
      await Haptics.vibrate({ duration });
    } catch (error) {
      console.log('[Haptics] Vibrate not available');
    }
  }, [isNative]);

  return {
    isNative,
    lightImpact,
    mediumImpact,
    heavyImpact,
    selectionFeedback,
    successNotification,
    warningNotification,
    errorNotification,
    vibrate,
  };
}

export default useHaptics;
