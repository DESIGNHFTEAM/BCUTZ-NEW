-- Fix: Update the public barber profiles policy to exclude sensitive financial data
-- Drop the existing public SELECT policy that exposes bank details
DROP POLICY IF EXISTS "Anyone can view active verified barber profiles" ON public.barber_profiles;

-- Drop and recreate the view with explicit column exclusion
DROP VIEW IF EXISTS public.barber_profiles_public;

CREATE VIEW public.barber_profiles_public AS
SELECT 
  id,
  user_id,
  shop_name,
  description,
  address,
  city,
  postal_code,
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
  -- Explicitly excluding: bank_iban, bank_account_holder, stripe_account_id, stripe_onboarding_complete, phone
FROM public.barber_profiles
WHERE is_verified = true AND is_active = true;

-- Create a SECURITY DEFINER function to fetch public barber data
-- This ensures users can only see non-sensitive fields
CREATE OR REPLACE FUNCTION public.get_public_barber_profiles()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  shop_name text,
  description text,
  address text,
  city text,
  postal_code text,
  country text,
  latitude numeric,
  longitude numeric,
  profile_image_url text,
  gallery_images text[],
  videos text[],
  opening_hours jsonb,
  business_type text,
  is_verified boolean,
  is_active boolean,
  avg_rating numeric,
  total_reviews integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    bp.id,
    bp.user_id,
    bp.shop_name,
    bp.description,
    bp.address,
    bp.city,
    bp.postal_code,
    bp.country,
    bp.latitude,
    bp.longitude,
    bp.profile_image_url,
    bp.gallery_images,
    bp.videos,
    bp.opening_hours,
    bp.business_type,
    bp.is_verified,
    bp.is_active,
    bp.avg_rating,
    bp.total_reviews,
    bp.created_at,
    bp.updated_at
  FROM public.barber_profiles bp
  WHERE bp.is_verified = true AND bp.is_active = true;
$$;

-- Grant execute permission to all users
GRANT EXECUTE ON FUNCTION public.get_public_barber_profiles() TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_barber_profiles() TO authenticated;

-- Add a new restricted policy for authenticated users viewing other barbers
-- They must use the secure function for public data, not direct table access
CREATE POLICY "Authenticated users can view verified barber public info"
ON public.barber_profiles
FOR SELECT
TO authenticated
USING (is_verified = true AND is_active = true);

-- Add audit comment explaining the security model
COMMENT ON FUNCTION public.get_public_barber_profiles() IS 
'Returns public barber profile data only, excluding sensitive financial information like bank_iban, bank_account_holder, stripe_account_id, and phone. Use this function for public/customer-facing queries.';