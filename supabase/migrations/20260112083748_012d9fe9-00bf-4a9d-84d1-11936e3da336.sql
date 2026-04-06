-- Fix security definer view issue by setting SECURITY INVOKER (default in Postgres 15+)
-- For older versions, we'll drop and recreate with explicit security invoker
DROP VIEW IF EXISTS barber_profiles_public;

CREATE VIEW barber_profiles_public 
WITH (security_invoker = true)
AS
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
  latitude,
  longitude,
  opening_hours,
  is_verified,
  is_active,
  avg_rating,
  total_reviews,
  created_at,
  updated_at
FROM barber_profiles
WHERE is_active = true;