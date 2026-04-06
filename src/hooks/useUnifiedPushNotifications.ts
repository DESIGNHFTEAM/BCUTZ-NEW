import { Capacitor } from '@capacitor/core';
import { usePushNotifications } from './usePushNotifications';
import { useNativePushNotifications } from './useNativePushNotifications';

/**
 * Unified push notifications hook that works on both web and native platforms.
 * Automatically detects the platform and uses the appropriate implementation.
 */
export function useUnifiedPushNotifications() {
  const isNative = Capacitor.isNativePlatform();
  
  // Use the appropriate hook based on platform
  const webPush = usePushNotifications();
  const nativePush = useNativePushNotifications();

  if (isNative) {
    return {
      isSupported: nativePush.isSupported,
      isSubscribed: nativePush.isRegistered,
      isLoading: nativePush.isLoading,
      permission: nativePush.permission === 'granted' ? 'granted' : 
                  nativePush.permission === 'denied' ? 'denied' : 'default',
      token: nativePush.token,
      isNative: true,
      requestPermission: nativePush.requestPermission,
      unsubscribe: nativePush.unregister,
      // Native-specific methods
      getDeliveredNotifications: nativePush.getDeliveredNotifications,
      removeAllDeliveredNotifications: nativePush.removeAllDeliveredNotifications,
    };
  }

  return {
    isSupported: webPush.isSupported,
    isSubscribed: webPush.isSubscribed,
    isLoading: webPush.isLoading,
    permission: webPush.permission,
    token: null,
    isNative: false,
    requestPermission: webPush.requestPermission,
    unsubscribe: webPush.unsubscribe,
    sendNotification: webPush.sendNotification,
  };
}
