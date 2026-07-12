import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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

  // Intercepts the OAuth redirect (bcutz://auth/callback) fired by the system
  // browser after Google/Apple sign-in. Default-agnostic: handles PKCE (?code=)
  // AND implicit (#access_token=) so we don't have to force a global flowType
  // and risk regressing the web email/reset flows.
  const handleAuthCallback = useCallback(async (url: string): Promise<boolean> => {
    if (!url.startsWith('bcutz://auth/callback')) return false;
    console.log('[DeepLinks] Handling OAuth callback');

    const queryStr = url.includes('?') ? url.split('?')[1].split('#')[0] : '';
    const hashStr = url.includes('#') ? url.split('#')[1] : '';
    const query = new URLSearchParams(queryStr);
    const hash = new URLSearchParams(hashStr);

    const code = query.get('code');
    const errorDescription =
      query.get('error_description') || hash.get('error_description');
    const accessToken = hash.get('access_token');
    const refreshToken = hash.get('refresh_token');

    try {
      if (errorDescription) throw new Error(errorDescription);

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
      } else if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) throw error;
      } else {
        // Not a shape we recognise — let the normal router try.
        return false;
      }

      try { await Browser.close(); } catch { /* browser may already be closed */ }
      navigate('/');
      return true;
    } catch (error) {
      console.error('[DeepLinks] OAuth callback failed:', error);
      try { await Browser.close(); } catch { /* browser may already be closed */ }
      toast({
        title: 'Sign in failed',
        description: 'We could not complete sign in. Please try again.',
        variant: 'destructive',
      });
      navigate('/auth');
      return true;
    }
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
    const urlOpenListener = App.addListener('appUrlOpen', async (event: URLOpenListenerEvent) => {
      console.log('[DeepLinks] App opened with URL:', event.url);
      // OAuth callback takes priority — if it consumes the URL, stop here.
      if (await handleAuthCallback(event.url)) return;
      handleDeepLink(event.url);
    });

    // Check if app was opened with a URL (cold start)
    App.getLaunchUrl().then(async (result) => {
      if (result?.url) {
        console.log('[DeepLinks] App launched with URL:', result.url);
        if (await handleAuthCallback(result.url)) return;
        handleDeepLink(result.url);
      }
    }).catch((error) => {
      console.error('[DeepLinks] Error getting launch URL:', error);
    });

    return () => {
      urlOpenListener.then(listener => listener.remove());
    };
  }, [handleDeepLink, handleAuthCallback]);

  return {
    handleDeepLink,
    handleAuthCallback,
    handleNotificationDeepLink,
  };
}

export default useDeepLinks;
