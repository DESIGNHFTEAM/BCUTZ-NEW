-- ============================================
-- FIX: Change view from SECURITY DEFINER to SECURITY INVOKER
-- ============================================

-- Drop and recreate the view with explicit SECURITY INVOKER
DROP VIEW IF EXISTS public.barber_profiles_public;

CREATE VIEW public.barber_profiles_public
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  shop_name,
  description,
  city,
  country,
  profile_image_url,
  gallery_images,
  opening_hours,
  latitude,
  longitude,
  avg_rating,
  total_reviews,
  is_verified,
  is_active,
  created_at,
  updated_at
FROM public.barber_profiles
WHERE is_active = true;

-- Re-grant SELECT permissions
GRANT SELECT ON public.barber_profiles_public TO anon;
GRANT SELECT ON public.barber_profiles_public TO authenticated;

-- Add a permissive policy on barber_profiles for the view to work
-- This allows SELECT but the view only exposes safe columns
CREATE POLICY "Public can read active barber profiles for view"
ON public.barber_profiles FOR SELECT
USING (is_active = true);