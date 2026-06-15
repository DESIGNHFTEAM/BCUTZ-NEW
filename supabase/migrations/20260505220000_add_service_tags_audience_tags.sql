-- Frontend code (Barbers.tsx, BarberProfile.tsx) selects barber_profiles.service_tags
-- and barber_profiles.audience_tags but the columns didn't exist, causing the homepage
-- "trending barbers" REST query to return HTTP 400. Adding both as nullable TEXT[] arrays
-- with safe defaults so the homepage stops 400ing.
--
-- Verified missing on 2026-05-05 by inspecting live Supabase project mistdeyttbkqrxcvnrlp
-- and observing the broken bcutz.com homepage requests for these columns.

ALTER TABLE public.barber_profiles
  ADD COLUMN IF NOT EXISTS service_tags TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS audience_tags TEXT[] DEFAULT '{}'::text[];

-- Update the public view to expose the new columns (RLS-safe security_invoker view).
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
  business_type,
  service_tags,
  audience_tags,
  created_at,
  updated_at
FROM public.barber_profiles
WHERE is_active = true;

GRANT SELECT ON public.barber_profiles_public TO anon;
GRANT SELECT ON public.barber_profiles_public TO authenticated;
