-- Drop the insecure INSERT policy that allows users to add any role
DROP POLICY IF EXISTS "Users can insert their own roles on signup" ON public.user_roles;

-- Create a SECURITY DEFINER function to safely add barber role
-- This function ensures users can ONLY add the 'barber' role to themselves (not 'admin')
CREATE OR REPLACE FUNCTION public.request_barber_role()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
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
  
  -- Insert the barber role for the authenticated user
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'barber');
  
  RETURN true;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.request_barber_role() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.request_barber_role() IS 
'Safely assigns the barber role to the authenticated user. 
This is the ONLY way users can become barbers. Admin roles cannot be self-assigned.';