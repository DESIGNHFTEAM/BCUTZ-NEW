
-- Drop and recreate the barber_profiles_public view to include videos
DROP VIEW IF EXISTS public.barber_profiles_public;

CREATE VIEW public.barber_profiles_public AS
SELECT 
  id,
  user_id,
  shop_name,
  description,
  address,
  city,
  country,
  profile_image_url,
  gallery_images,
  videos,
  latitude,
  longitude,
  opening_hours,
  is_verified,
  is_active,
  avg_rating,
  total_reviews,
  created_at,
  updated_at
FROM public.barber_profiles
WHERE is_active = true AND is_verified = true;

-- Grant select access to authenticated and anon roles
GRANT SELECT ON public.barber_profiles_public TO authenticated;
GRANT SELECT ON public.barber_profiles_public TO anon;
