
-- 1. Fix profiles RLS: Restrict barber access to customers with recent bookings (90 days)
DROP POLICY IF EXISTS "Barbers can view customer profiles for their bookings" ON public.profiles;

CREATE POLICY "Barbers can view customer profiles for recent bookings"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM bookings b
    JOIN barber_profiles bp ON b.barber_id = bp.id
    WHERE bp.user_id = auth.uid()
      AND b.customer_id = profiles.id
      AND b.status IN ('pending', 'confirmed', 'completed')
      AND b.booking_date >= (CURRENT_DATE - INTERVAL '90 days')
  )
);

-- 2. Add booking time slot conflict prevention trigger
CREATE OR REPLACE FUNCTION public.check_booking_conflicts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check for overlapping bookings for the same barber on the same date
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE barber_id = NEW.barber_id
      AND booking_date = NEW.booking_date
      AND status IN ('pending', 'confirmed')
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND (
        (NEW.start_time >= start_time AND NEW.start_time < end_time)
        OR (NEW.end_time > start_time AND NEW.end_time <= end_time)
        OR (NEW.start_time <= start_time AND NEW.end_time >= end_time)
      )
  ) THEN
    RAISE EXCEPTION 'Time slot is already booked';
  END IF;

  -- Validate booking_date is not in the past
  IF NEW.booking_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Cannot book in the past';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER check_booking_conflicts_trigger
BEFORE INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.check_booking_conflicts();

-- 3. Add file type restrictions to gallery storage
-- Drop existing overly permissive insert policy and recreate with type check
DROP POLICY IF EXISTS "Barbers can upload gallery images" ON storage.objects;

CREATE POLICY "Barbers can upload gallery images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'gallery'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM barber_profiles WHERE user_id = auth.uid()
  )
  AND (
    LOWER(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'gif', 'avif')
  )
);

-- Add file type restrictions to videos storage
DROP POLICY IF EXISTS "Barbers can upload videos" ON storage.objects;

CREATE POLICY "Barbers can upload videos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'videos'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM barber_profiles WHERE user_id = auth.uid()
  )
  AND (
    LOWER(storage.extension(name)) IN ('mp4', 'webm', 'mov')
  )
);
