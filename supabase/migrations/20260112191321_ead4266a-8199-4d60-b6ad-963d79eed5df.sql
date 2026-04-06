-- Drop and recreate the barber_profiles_public view WITHOUT the address column
-- This protects barber physical addresses from public exposure while keeping city/coordinates for map functionality

DROP VIEW IF EXISTS public.barber_profiles_public;

CREATE VIEW public.barber_profiles_public 
WITH (security_invoker = true) AS
SELECT
  id,
  user_id,
  shop_name,
  description,
  -- REMOVED: address (full street address) - privacy protection
  -- REMOVED: postal_code - privacy protection  
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
FROM public.barber_profiles
WHERE is_verified = true AND is_active = true;