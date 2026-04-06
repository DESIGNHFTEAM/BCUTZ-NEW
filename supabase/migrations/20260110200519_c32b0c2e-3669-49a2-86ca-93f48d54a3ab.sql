-- ============================================
-- SECURITY FIX: Protect sensitive barber data (banking, full address)
-- ============================================

-- 1. Drop existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can view active barber profiles" ON public.barber_profiles;

-- 2. Create policy that allows barbers to view their own FULL profile (including banking)
CREATE POLICY "Barbers can view their own full profile"
ON public.barber_profiles FOR SELECT
USING (auth.uid() = user_id);

-- 3. Create a secure view for PUBLIC data only (excludes sensitive fields)
CREATE OR REPLACE VIEW public.barber_profiles_public AS
SELECT 
  id,
  user_id,
  shop_name,
  description,
  city,
  country,
  -- Exclude: address, postal_code (full physical location)
  -- Exclude: bank_iban, bank_account_holder (financial data)
  -- Exclude: phone (direct contact - show only in booking context)
  profile_image_url,
  gallery_images,
  opening_hours,
  latitude,
  longitude,
  avg_rating,
  total_reviews,
  is_verified,
  is_active,
  created_at,
  updated_at
FROM public.barber_profiles
WHERE is_active = true;

-- 4. Grant SELECT on public view to anonymous and authenticated users
GRANT SELECT ON public.barber_profiles_public TO anon;
GRANT SELECT ON public.barber_profiles_public TO authenticated;

-- 5. Create a function to get barber contact info for authenticated booking context
CREATE OR REPLACE FUNCTION public.get_barber_contact_for_booking(p_barber_id UUID)
RETURNS TABLE (
  phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return contact info if user has an active/pending booking with this barber
  IF NOT EXISTS (
    SELECT 1 FROM bookings 
    WHERE customer_id = auth.uid() 
    AND barber_id = p_barber_id 
    AND status IN ('pending', 'confirmed')
  ) THEN
    RAISE EXCEPTION 'You must have an active booking to view barber contact details';
  END IF;
  
  RETURN QUERY
  SELECT bp.phone, bp.address, bp.city, bp.postal_code, bp.country
  FROM barber_profiles bp
  WHERE bp.id = p_barber_id AND bp.is_active = true;
END;
$$;

-- Grant execute to authenticated users only
GRANT EXECUTE ON FUNCTION public.get_barber_contact_for_booking(UUID) TO authenticated;