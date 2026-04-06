-- Fix 1: Block direct inserts into loyalty_transactions
-- Only edge functions with service role should be able to insert transactions
CREATE POLICY "Prevent direct transaction inserts"
ON public.loyalty_transactions
FOR INSERT
WITH CHECK (false);

-- Fix 2: Replace add_barber_role_to_self with proper validation
CREATE OR REPLACE FUNCTION public.request_barber_role()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_has_profile boolean;
BEGIN
  -- Get the authenticated user's ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Check if user already has barber role
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = v_user_id AND role = 'barber'
  ) THEN
    -- Already has role, return true (idempotent)
    RETURN true;
  END IF;
  
  -- CRITICAL: Verify user has created and activated a barber profile
  SELECT EXISTS (
    SELECT 1 FROM public.barber_profiles 
    WHERE user_id = v_user_id 
    AND is_active = true
  ) INTO v_has_profile;
  
  IF NOT v_has_profile THEN
    RAISE EXCEPTION 'Active barber profile required before requesting barber role';
  END IF;
  
  -- Insert the barber role for the authenticated user
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'barber');
  
  RETURN true;
END;
$$;

-- Drop the old unsafe function if it exists
DROP FUNCTION IF EXISTS public.add_barber_role_to_self();