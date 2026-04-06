-- Fix 1: Add input validation to process_referral_signup function
-- Validates referral code format (8 characters, alphanumeric) before processing
CREATE OR REPLACE FUNCTION public.process_referral_signup(p_referral_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  referral_record RECORD;
BEGIN
  -- Input validation: Check for NULL or empty input
  IF p_referral_code IS NULL OR length(trim(p_referral_code)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Referral code is required');
  END IF;
  
  -- Normalize input: uppercase and trim whitespace
  p_referral_code := upper(trim(p_referral_code));
  
  -- Input validation: Check length (must be exactly 8 characters)
  IF length(p_referral_code) != 8 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid referral code format');
  END IF;
  
  -- Input validation: Check character set (only alphanumeric allowed)
  -- Pattern matches the generator: ABCDEFGHJKLMNPQRSTUVWXYZ23456789 (no I, O, 0, 1 to avoid confusion)
  IF p_referral_code !~ '^[A-HJ-NP-Z2-9]{8}$' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid referral code format');
  END IF;
  
  -- Find the referral
  SELECT * INTO referral_record
  FROM public.referrals
  WHERE referral_code = p_referral_code
    AND status = 'pending'
    AND referred_user_id IS NULL
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid or already used referral code');
  END IF;
  
  -- Can't refer yourself
  IF referral_record.referrer_id = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cannot use your own referral code');
  END IF;
  
  -- Update the referral with the new user
  UPDATE public.referrals
  SET referred_user_id = auth.uid(),
      status = 'signed_up'
  WHERE id = referral_record.id;
  
  RETURN jsonb_build_object('success', true, 'message', 'Referral registered! Complete a booking to earn rewards.');
END;
$$;

-- Fix 2: Revoke unused anonymous grants for cleaner security posture
-- Note: RLS policies already enforce authentication, so these grants are redundant
REVOKE SELECT ON public.barber_profiles_public FROM anon;
REVOKE SELECT ON public.profiles_public FROM anon;
REVOKE SELECT ON public.barber_profiles_safe FROM anon;

-- Also revoke execute on functions that should require authentication
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.current_user_has_role(app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_founder(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_super_founder(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.current_user_is_founder() FROM anon;