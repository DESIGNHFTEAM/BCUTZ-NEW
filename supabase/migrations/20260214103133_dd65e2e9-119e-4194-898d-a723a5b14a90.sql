
-- Fix 1: Remove address and postal_code from barber_profiles_public view
DROP VIEW IF EXISTS public.barber_profiles_public;

CREATE VIEW public.barber_profiles_public
WITH (security_invoker = on)
AS
SELECT 
  id,
  user_id,
  shop_name,
  description,
  city,
  country,
  latitude,
  longitude,
  profile_image_url,
  gallery_images,
  videos,
  opening_hours,
  business_type,
  is_verified,
  is_active,
  avg_rating,
  total_reviews,
  created_at,
  updated_at
FROM public.barber_profiles
WHERE is_verified = true AND is_active = true;

-- Fix 2: Add length constraints on user-submitted text fields
ALTER TABLE public.reviews ADD CONSTRAINT review_comment_length CHECK (length(comment) <= 1000);
ALTER TABLE public.reports ADD CONSTRAINT report_desc_length CHECK (length(description) <= 2000);
ALTER TABLE public.booking_comments ADD CONSTRAINT comment_length CHECK (length(comment) <= 500);
ALTER TABLE public.reviews ADD CONSTRAINT review_reply_length CHECK (length(barber_reply) <= 1000);
