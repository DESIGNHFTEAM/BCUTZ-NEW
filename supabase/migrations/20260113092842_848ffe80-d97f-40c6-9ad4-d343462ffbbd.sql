-- Fix: Barber financial data exposure
-- Problem: The current SELECT policy on barber_profiles returns ALL columns including bank_iban, bank_account_holder, stripe_account_id to any authenticated user

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view verified barber public info" ON barber_profiles;

-- Create a more restrictive policy that only allows viewing public information
-- We use a database function to filter columns at the RLS level
-- For public viewing, we use the barber_profiles_public view instead

-- Create a policy that only allows authenticated users to see public barber info via the view
-- The barber_profiles table should only be fully accessible by the barber themselves or admins

-- Recreate the policy for public viewing - this will only work via the barber_profiles_public view
-- Direct queries to barber_profiles should be limited

-- Option 1: Barbers can view their own full profile (already exists)
-- Option 2: Admins/founders can view all profiles for verification purposes
CREATE POLICY "Admins can view all barber profiles"
  ON barber_profiles
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_founder(auth.uid()));

-- Create a security definer function to get public barber data without exposing sensitive fields
CREATE OR REPLACE FUNCTION public.get_public_barber_profile(p_barber_id uuid)
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
  avg_rating numeric,
  total_reviews integer,
  is_verified boolean,
  is_active boolean,
  business_type text,
  created_at timestamptz,
  updated_at timestamptz
) 
LANGUAGE sql
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
    bp.avg_rating,
    bp.total_reviews,
    bp.is_verified,
    bp.is_active,
    bp.business_type,
    bp.created_at,
    bp.updated_at
  FROM barber_profiles bp
  WHERE bp.id = p_barber_id
    AND bp.is_verified = true 
    AND bp.is_active = true;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.get_public_barber_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_barber_profile(uuid) TO anon;