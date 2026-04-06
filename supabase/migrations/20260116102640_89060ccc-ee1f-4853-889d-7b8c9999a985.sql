-- Fix: Grant execute permissions on has_role function to all users
-- This is needed because RLS policies use this function and views with security_invoker need it
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon;

-- Grant execute on other security functions used by RLS
GRANT EXECUTE ON FUNCTION public.is_founder(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_founder(uuid) TO anon;

GRANT EXECUTE ON FUNCTION public.current_user_has_role(app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_has_role(app_role) TO anon;

GRANT EXECUTE ON FUNCTION public.current_user_is_founder() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_is_founder() TO anon;

-- Fix: Recreate barber_profiles_public view WITHOUT security_invoker 
-- to allow public access without RLS policy checks on base table
DROP VIEW IF EXISTS public.barber_profiles_public CASCADE;

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
  -- Excludes: bank_iban, bank_account_holder, stripe_account_id, stripe_onboarding_complete, phone
FROM public.barber_profiles
WHERE is_verified = true AND is_active = true;

-- Grant access to the view
GRANT SELECT ON public.barber_profiles_public TO authenticated;
GRANT SELECT ON public.barber_profiles_public TO anon;