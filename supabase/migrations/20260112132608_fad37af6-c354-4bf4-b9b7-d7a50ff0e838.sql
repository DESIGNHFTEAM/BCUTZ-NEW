-- Recreate the view with SECURITY INVOKER to use querying user's permissions
DROP VIEW IF EXISTS public.barber_profiles_public;

CREATE VIEW public.barber_profiles_public 
WITH (security_invoker = true) AS
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
  opening_hours,
  latitude,
  longitude,
  is_verified,
  is_active,
  avg_rating,
  total_reviews,
  business_type,
  created_at,
  updated_at
FROM public.barber_profiles;