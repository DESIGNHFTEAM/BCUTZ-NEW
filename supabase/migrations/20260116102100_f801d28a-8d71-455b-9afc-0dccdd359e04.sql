-- =====================================================
-- FIX 1: Create secure view for profiles table 
-- to hide sensitive PII from public access
-- =====================================================

-- Create a public-safe view of profiles that excludes sensitive PII
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT 
  id,
  full_name,
  avatar_url,
  preferred_language,
  created_at,
  updated_at
  -- Excludes: email, phone, birthday, address, postal_code, city, country
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;

-- =====================================================
-- FIX 2: Create secure view for barber_profiles table
-- to hide financial data from public access  
-- =====================================================

-- Create a public-safe view of barber profiles that excludes financial data
CREATE OR REPLACE VIEW public.barber_profiles_safe
WITH (security_invoker = on) AS
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
  phone,
  created_at,
  updated_at
  -- Excludes: bank_iban, bank_account_holder, stripe_account_id, stripe_onboarding_complete
FROM public.barber_profiles;

-- Grant access to the view  
GRANT SELECT ON public.barber_profiles_safe TO authenticated;
GRANT SELECT ON public.barber_profiles_safe TO anon;

-- =====================================================
-- FIX 3: Update RLS policies to better protect base tables
-- =====================================================

-- Drop any overly permissive policy on profiles if exists
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Ensure no anonymous access to full profiles table
-- The existing policies are already restrictive, but let's verify there's no public access

-- For barber_profiles, the current policies are:
-- 1. Admins can view all barber profiles
-- 2. Barbers can view their own full profile  
-- 3. Need to add: Public can view public info via the function/view

-- Create a secure function for public barber profile access (without financial data)
CREATE OR REPLACE FUNCTION public.get_barber_profile_public(p_barber_id uuid)
RETURNS TABLE(
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
  phone text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
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
    bp.phone,
    bp.created_at,
    bp.updated_at
  FROM barber_profiles bp
  WHERE bp.id = p_barber_id
    AND bp.is_verified = true 
    AND bp.is_active = true;
$$;

-- Create secure function for listing all public barber profiles (without financial data)
CREATE OR REPLACE FUNCTION public.list_public_barber_profiles()
RETURNS TABLE(
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
  phone text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
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
    bp.phone,
    bp.created_at,
    bp.updated_at
  FROM barber_profiles bp
  WHERE bp.is_verified = true AND bp.is_active = true;
$$;

-- Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION public.get_barber_profile_public(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_barber_profile_public(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.list_public_barber_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_barber_profiles() TO anon;