-- Update manage_admin_role to also log activity
CREATE OR REPLACE FUNCTION public.manage_admin_role(target_user_id uuid, action text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_founder boolean;
  target_name text;
  target_email text;
BEGIN
  -- Check if the caller is a founder
  SELECT public.is_founder(auth.uid()) INTO caller_is_founder;
  
  IF NOT caller_is_founder THEN
    RAISE EXCEPTION 'Only founders can manage admin roles';
  END IF;
  
  -- Get target user info for logging
  SELECT full_name, email INTO target_name, target_email
  FROM public.profiles
  WHERE id = target_user_id;
  
  IF action = 'grant' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Log the activity
    INSERT INTO public.admin_activity_log (actor_id, action_type, target_user_id, details)
    VALUES (auth.uid(), 'admin_role_granted', target_user_id, 
      jsonb_build_object('target_name', target_name, 'target_email', target_email));
    
    RETURN true;
  ELSIF action = 'revoke' THEN
    DELETE FROM public.user_roles
    WHERE user_id = target_user_id AND role = 'admin';
    
    -- Log the activity
    INSERT INTO public.admin_activity_log (actor_id, action_type, target_user_id, details)
    VALUES (auth.uid(), 'admin_role_revoked', target_user_id, 
      jsonb_build_object('target_name', target_name, 'target_email', target_email));
    
    RETURN true;
  ELSE
    RAISE EXCEPTION 'Invalid action. Use grant or revoke';
  END IF;
END;
$$;