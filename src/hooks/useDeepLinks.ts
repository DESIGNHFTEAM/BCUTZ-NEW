import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { toast } from '@/hooks/use-toast';

interface DeepLinkRoute {
  pattern: RegExp;
  handler: (matches: RegExpMatchArray, navigate: ReturnType<typeof useNavigate>) => void;
}

const deepLinkRoutes: DeepLinkRoute[] = [
  {
    // bcutz://bookings or bcutz://bookings/
    pattern: /^bcutz:\/\/bookings\/?$/,
    handler: (_, navigate) => navigate('/bookings'),
  },
  {
    // bcutz://bookings/:id
    pattern: /^bcutz:\/\/bookings\/([a-zA-Z0-9-]+)$/,
    handler: (matches, navigate) => navigate(`/bookings?highlight=${matches[1]}`),
  },
  {
    // bcutz://barber/:id
    pattern: /^bcutz:\/\/barber\/([a-zA-Z0-9-]+)$/,
    handler: (matches, navigate) => navigate(`/barber/${matches[1]}`),
  },
  {
    // bcutz://barbers
    pattern: /^bcutz:\/\/barbers\/?$/,
    handler: (_, navigate) => navigate('/barbers'),
  },
  {
    // bcutz://loyalty
    pattern: /^bcutz:\/\/loyalty\/?$/,
    handler: (_, navigate) => navigate('/loyalty'),
  },
  {
    // bcutz://settings
    pattern: /^bcutz:\/\/settings\/?$/,
    handler: (_, navigate) => navigate('/dashboard'),
  },
  {
    // bcutz://profile
    pattern: /^bcutz:\/\/profile\/?$/,
    handler: (_, navigate) => navigate('/profile'),
  },
  {
    // bcutz://auth
    pattern: /^bcutz:\/\/auth\/?$/,
    handler: (_, navigate) => navigate('/auth'),
  },
  {
    // HTTPS Universal Links - https://bcutz.app/barber/:id
    pattern: /^https:\/\/(?:www\.)?bcutz\.app\/barber\/([a-zA-Z0-9-]+)$/,
    handler: (matches, navigate) => navigate(`/barber/${matches[1]}`),
  },
  {
    // HTTPS Universal Links - https://bcutz.app/bookings
    pattern: /^https:\/\/(?:www\.)?bcutz\.app\/bookings\/?$/,
    handler: (_, navigate) => navigate('/bookings'),
  },
];

export function useDeepLinks() {
  const navigate = useNavigate();

  const handleDeepLink = useCallback((url: string) => {
    console.log('[DeepLinks] Handling URL:', url);

    for (const route of deepLinkRoutes) {
      const matches = url.match(route.pattern);
      if (matches) {
        console.log('[DeepLinks] Matched route:', route.pattern.source);
        try {
          route.handler(matches, navigate);
          return true;
        } catch (error) {
          console.error('[DeepLinks] Error handling route:', error);
          toast({
            title: 'Navigation Error',
            description: 'Failed to open the requested page.',
            variant: 'destructive',
          });
          return false;
        }
      }
    }

    console.log('[DeepLinks] No matching route found for:', url);
    return false;
  }, [navigate]);

  const handleNotificationDeepLink = useCallback((data: Record<string, unknown>) => {
    console.log('[DeepLinks] Handling notification data:', data);

    // Check for explicit URL in notification data
    if (data.url && typeof data.url === 'string') {
      return handleDeepLink(data.url);
    }

    // Handle by notification type
    const type = data.type as string;
    const bookingId = data.bookingId as string;

    switch (type) {
      case 'booking':
      case 'reminder':
        if (bookingId) {
          navigate(`/bookings?highlight=${bookingId}`);
        } else {
          navigate('/bookings');
        }
        return true;
      case 'payment':
        if (bookingId) {
          navigate(`/bookings?highlight=${bookingId}`);
        } else {
          navigate('/bookings');
        }
        return true;
      case 'promotion':
        navigate('/loyalty');
        return true;
      default:
        // Default to bookings page for unknown types
        if (bookingId) {
          navigate(`/bookings?highlight=${bookingId}`);
          return true;
        }
        return false;
    }
  }, [navigate, handleDeepLink]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      console.log('[DeepLinks] Not on native platform, skipping setup');
      return;
    }

    console.log('[DeepLinks] Setting up deep link listeners');

    // Handle app opened via URL while running
    const urlOpenListener = App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      console.log('[DeepLinks] App opened with URL:', event.url);
      handleDeepLink(event.url);
    });

    // Check if app was opened with a URL (cold start)
    App.getLaunchUrl().then((result) => {
      if (result?.url) {
        console.log('[DeepLinks] App launched with URL:', result.url);
        handleDeepLink(result.url);
      }
    }).catch((error) => {
      console.error('[DeepLinks] Error getting launch URL:', error);
    });

    return () => {
      urlOpenListener.then(listener => listener.remove());
    };
  }, [handleDeepLink]);

  return {
    handleDeepLink,
    handleNotificationDeepLink,
  };
}

export default useDeepLinks;
