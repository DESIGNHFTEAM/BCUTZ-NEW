-- Recreate barber_profiles_public view to include address for map display
DROP VIEW IF EXISTS barber_profiles_public;

CREATE VIEW barber_profiles_public AS
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