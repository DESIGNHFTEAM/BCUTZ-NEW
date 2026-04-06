import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  PushNotificationSchema,
  ActionPerformed,
  Token,
} from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from '@/hooks/use-toast';

interface NativePushState {
  isNative: boolean;
  isSupported: boolean;
  isRegistered: boolean;
  isLoading: boolean;
  token: string | null;
  permission: 'prompt' | 'granted' | 'denied';
}

export function useNativePushNotifications() {
  const { user } = useAuth();
  const [state, setState] = useState<NativePushState>({
    isNative: false,
    isSupported: false,
    isRegistered: false,
    isLoading: true,
    token: null,
    permission: 'prompt',
  });

  // Check if we're running on a native platform
  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();
    const isSupported = isNative && Capacitor.isPluginAvailable('PushNotifications');

    setState(prev => ({
      ...prev,
      isNative,
      isSupported,
      isLoading: isSupported,
    }));

    if (!isSupported) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    // Check current permission status
    PushNotifications.checkPermissions().then(result => {
      setState(prev => ({
        ...prev,
        permission: result.receive as 'prompt' | 'granted' | 'denied',
        isLoading: false,
      }));
    });
  }, []);

  // Set up listeners for push notification events
  useEffect(() => {
    if (!state.isSupported) return;

    // On successful registration, save the token
    const registrationListener = PushNotifications.addListener(
      'registration',
      async (token: Token) => {
        console.log('[NativePush] Registration success, token:', token.value.substring(0, 20) + '...');
        setState(prev => ({
          ...prev,
          token: token.value,
          isRegistered: true,
        }));

        // Save token to push_tokens table
        if (user) {
          try {
            const platform = Capacitor.getPlatform() as 'ios' | 'android';
            const { error } = await supabase
              .from('push_tokens')
              .upsert({
                user_id: user.id,
                token: token.value,
                platform,
                device_id: Capacitor.getPlatform(),
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'user_id,token',
              });
            
            if (error) {
              console.error('[NativePush] Error saving token:', error);
            } else {
              console.log('[NativePush] Token saved for user:', user.id);
            }
          } catch (error) {
            console.error('[NativePush] Error saving push token:', error);
          }
        }
      }
    );

    // On registration error
    const errorListener = PushNotifications.addListener(
      'registrationError',
      (error: any) => {
        console.error('Push registration error:', error);
        toast({
          title: 'Push Registration Failed',
          description: 'Unable to register for push notifications.',
          variant: 'destructive',
        });
      }
    );

    // When a notification is received while app is in foreground
    const receivedListener = PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('Push notification received:', notification);
        
        // Show a toast for foreground notifications
        toast({
          title: notification.title || 'New Notification',
          description: notification.body || '',
        });
      }
    );

    // When user taps on a notification
    const actionListener = PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (notification: ActionPerformed) => {
        console.log('[NativePush] Notification action performed:', notification);
        
        // Dispatch event for deep link handler
        const data = notification.notification.data;
        if (data) {
          const event = new CustomEvent('pushNotificationTap', { detail: data });
          window.dispatchEvent(event);
        }
      }
    );

    // Cleanup listeners on unmount
    return () => {
      registrationListener.then(l => l.remove());
      errorListener.then(l => l.remove());
      receivedListener.then(l => l.remove());
      actionListener.then(l => l.remove());
    };
  }, [state.isSupported, user]);

  // Request permission and register for push notifications
  const requestPermission = useCallback(async () => {
    if (!state.isSupported) {
      console.log('Push notifications not supported on this platform');
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Request permission
      const permResult = await PushNotifications.requestPermissions();
      
      if (permResult.receive === 'granted') {
        // Register with APNS/FCM
        await PushNotifications.register();
        
        setState(prev => ({
          ...prev,
          permission: 'granted',
          isLoading: false,
        }));

        // Update notification settings in database
        if (user) {
          await supabase
            .from('notification_settings')
            .upsert({
              user_id: user.id,
              push_bookings: true,
              push_reminders: true,
              push_promotions: false,
            }, {
              onConflict: 'user_id',
            });
        }

        toast({
          title: 'Notifications Enabled',
          description: "You'll receive booking updates and reminders.",
        });

        return true;
      } else {
        setState(prev => ({
          ...prev,
          permission: permResult.receive as 'denied',
          isLoading: false,
        }));

        toast({
          title: 'Notifications Blocked',
          description: 'Please enable notifications in your device settings.',
          variant: 'destructive',
        });

        return false;
      }
    } catch (error) {
      console.error('Error requesting push permission:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [state.isSupported, user]);

  // Unregister from push notifications
  const unregister = useCallback(async () => {
    if (!state.isSupported || !state.isRegistered) return;

    try {
      // Note: There's no direct unregister method in Capacitor Push
      // The best practice is to remove the token from your server
      
      if (user) {
        await supabase
          .from('notification_settings')
          .upsert({
            user_id: user.id,
            push_bookings: false,
            push_reminders: false,
            push_promotions: false,
          }, {
            onConflict: 'user_id',
          });
      }

      setState(prev => ({
        ...prev,
        isRegistered: false,
        token: null,
      }));

      toast({
        title: 'Notifications Disabled',
        description: "You won't receive push notifications anymore.",
      });
    } catch (error) {
      console.error('Error unregistering push notifications:', error);
    }
  }, [state.isSupported, state.isRegistered, user]);

  // Get delivered notifications (iOS only)
  const getDeliveredNotifications = useCallback(async () => {
    if (!state.isSupported) return [];
    
    try {
      const result = await PushNotifications.getDeliveredNotifications();
      return result.notifications;
    } catch (error) {
      console.error('Error getting delivered notifications:', error);
      return [];
    }
  }, [state.isSupported]);

  // Remove all delivered notifications
  const removeAllDeliveredNotifications = useCallback(async () => {
    if (!state.isSupported) return;
    
    try {
      await PushNotifications.removeAllDeliveredNotifications();
    } catch (error) {
      console.error('Error removing notifications:', error);
    }
  }, [state.isSupported]);

  return {
    ...state,
    requestPermission,
    unregister,
    getDeliveredNotifications,
    removeAllDeliveredNotifications,
  };
}
