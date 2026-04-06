import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BarberData {
  id: string;
  user_id: string;
  shop_name: string;
  description: string | null;
  city: string;
  country: string;
  profile_image_url: string | null;
  gallery_images: string[];
  videos: string[];
  avg_rating: number;
  total_reviews: number;
  is_admin?: boolean;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  duration_minutes: number;
  barber_id: string;
  is_active: boolean;
}

interface BlockedTime {
  blocked_date: string;
  start_time: string;
  end_time: string;
}

interface ExistingBooking {
  booking_date: string;
  start_time: string;
  end_time: string;
}

interface PreflightData {
  barber: BarberData | null;
  services: Service[];
  blockedTimes: BlockedTime[];
  existingBookings: ExistingBooking[];
}

interface PreflightState {
  data: PreflightData;
  isLoading: boolean;
  error: string | null;
  isReady: boolean;
}

export function useBookingPreflight(barberId: string | undefined) {
  const [state, setState] = useState<PreflightState>({
    data: {
      barber: null,
      services: [],
      blockedTimes: [],
      existingBookings: [],
    },
    isLoading: true,
    error: null,
    isReady: false,
  });

  const fetchAllData = useCallback(async () => {
    if (!barberId) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'No barber ID provided',
        isReady: false,
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      isReady: false,
    }));

    try {
      // Parallel fetch of all required data
      const [barberResult, servicesResult, blockedTimesResult, bookingsResult] = await Promise.all([
        // 1. Fetch barber profile
        supabase
          .from('barber_profiles_public')
          .select('id, user_id, shop_name, description, city, country, profile_image_url, gallery_images, videos, avg_rating, total_reviews')
          .eq('id', barberId)
          .maybeSingle(),

        // 2. Fetch active services
        supabase
          .from('services')
          .select('*')
          .eq('barber_id', barberId)
          .eq('is_active', true),

        // 3. Fetch blocked times
        supabase
          .from('blocked_times')
          .select('blocked_date, start_time, end_time')
          .eq('barber_id', barberId),

        // 4. Fetch existing bookings
        supabase
          .from('bookings')
          .select('booking_date, start_time, end_time')
          .eq('barber_id', barberId)
          .in('status', ['pending', 'confirmed']),
      ]);

      // Check for critical errors
      if (barberResult.error) {
        console.error('Preflight: barber fetch error', barberResult.error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: `Could not load barber: ${barberResult.error.message}`,
          isReady: false,
        }));
        return;
      }

      if (!barberResult.data) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Barber not found or not available',
          isReady: false,
        }));
        return;
      }

      // Services error is non-blocking but we should log it
      if (servicesResult.error) {
        console.warn('Preflight: services fetch error', servicesResult.error);
      }

      // Blocked times error is non-blocking
      if (blockedTimesResult.error) {
        console.warn('Preflight: blocked times fetch error', blockedTimesResult.error);
      }

      // Bookings error is non-blocking
      if (bookingsResult.error) {
        console.warn('Preflight: existing bookings fetch error', bookingsResult.error);
      }

      // Check if barber is an admin (best-effort, non-blocking)
      let isAdmin = false;
      try {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', barberResult.data.user_id)
          .eq('role', 'admin')
          .maybeSingle();
        isAdmin = !!roleData;
      } catch (e) {
        console.warn('Preflight: admin role check failed', e);
      }

      setState({
        data: {
          barber: {
            ...barberResult.data,
            videos: barberResult.data.videos || [],
            gallery_images: barberResult.data.gallery_images || [],
            is_admin: isAdmin,
          },
          services: servicesResult.data || [],
          blockedTimes: blockedTimesResult.data || [],
          existingBookings: bookingsResult.data || [],
        },
        isLoading: false,
        error: null,
        isReady: true,
      });
    } catch (e) {
      console.error('Preflight: unexpected error', e);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'An unexpected error occurred while loading booking data',
        isReady: false,
      }));
    }
  }, [barberId]);

  // Initial fetch
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  return {
    ...state,
    refetch: fetchAllData,
  };
}
