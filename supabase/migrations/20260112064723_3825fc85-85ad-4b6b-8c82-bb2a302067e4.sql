-- Create a function to check if a user is a founder
CREATE OR REPLACE FUNCTION public.is_founder(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = 'founder'
  )
$$;

-- Create a function for current user founder check
CREATE OR REPLACE FUNCTION public.current_user_is_founder()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT public.is_founder(auth.uid())
$$;

-- Create a function for founders to grant/revoke admin role
CREATE OR REPLACE FUNCTION public.manage_admin_role(
  target_user_id uuid,
  action text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_founder boolean;
BEGIN
  -- Check if the caller is a founder
  SELECT public.is_founder(auth.uid()) INTO caller_is_founder;
  
  IF NOT caller_is_founder THEN
    RAISE EXCEPTION 'Only founders can manage admin roles';
  END IF;
  
  IF action = 'grant' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN true;
  ELSIF action = 'revoke' THEN
    DELETE FROM public.user_roles
    WHERE user_id = target_user_id AND role = 'admin';
    RETURN true;
  ELSE
    RAISE EXCEPTION 'Invalid action. Use grant or revoke';
  END IF;
END;
$$;