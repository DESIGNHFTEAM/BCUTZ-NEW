import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from '@/hooks/use-toast';

interface PushSubscriptionState {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permission: NotificationPermission | 'default';
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [state, setState] = useState<PushSubscriptionState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: true,
    permission: 'default',
  });

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      const isSupported = 'Notification' in window && 'serviceWorker' in navigator;
      const permission = isSupported ? Notification.permission : 'default';
      
      setState(prev => ({
        ...prev,
        isSupported,
        permission,
        isLoading: false,
      }));
    };

    checkSupport();
  }, []);

  // Request permission and subscribe
  const requestPermission = useCallback(async () => {
    if (!state.isSupported) {
      toast({
        title: "Not Supported",
        description: "Push notifications are not supported in this browser.",
        variant: "destructive",
      });
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const permission = await Notification.requestPermission();
      
      setState(prev => ({ 
        ...prev, 
        permission,
        isSubscribed: permission === 'granted',
        isLoading: false,
      }));

      if (permission === 'granted') {
        // Store preference in database if user is logged in
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
          title: "Notifications Enabled",
          description: "You'll receive booking updates and reminders.",
        });
        
        return true;
      } else if (permission === 'denied') {
        toast({
          title: "Notifications Blocked",
          description: "Please enable notifications in your browser settings.",
          variant: "destructive",
        });
        return false;
      }
      
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [state.isSupported, user]);

  // Send a local notification
  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (state.permission !== 'granted') {
      console.log('Notification permission not granted');
      return;
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }, [state.permission]);

  // Unsubscribe from notifications
  const unsubscribe = useCallback(async () => {
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

    setState(prev => ({ ...prev, isSubscribed: false }));
    
    toast({
      title: "Notifications Disabled",
      description: "You won't receive push notifications anymore.",
    });
  }, [user]);

  return {
    ...state,
    requestPermission,
    sendNotification,
    unsubscribe,
  };
}
