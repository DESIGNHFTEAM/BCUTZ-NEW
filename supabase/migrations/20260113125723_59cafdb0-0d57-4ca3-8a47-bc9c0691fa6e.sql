-- Update the manage_admin_role function to prevent barbers from being admins and log success status
CREATE OR REPLACE FUNCTION public.manage_admin_role(target_user_id uuid, action text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller_is_founder boolean;
  target_name text;
  target_email text;
  is_target_barber boolean;
BEGIN
  -- Check if the caller is a founder
  SELECT public.is_founder(auth.uid()) INTO caller_is_founder;
  
  IF NOT caller_is_founder THEN
    -- Log failed attempt
    INSERT INTO public.admin_activity_log (actor_id, action_type, target_user_id, details)
    VALUES (auth.uid(), 'admin_role_' || action || '_failed', target_user_id, 
      jsonb_build_object('success', false, 'error', 'Only founders can manage admin roles'));
    RAISE EXCEPTION 'Only founders can manage admin roles';
  END IF;
  
  -- Get target user info for logging
  SELECT full_name, email INTO target_name, target_email
  FROM public.profiles
  WHERE id = target_user_id;
  
  -- Check if target user is a barber
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = target_user_id AND role = 'barber'
  ) INTO is_target_barber;
  
  IF action = 'grant' THEN
    -- Prevent barbers from being made admins
    IF is_target_barber THEN
      INSERT INTO public.admin_activity_log (actor_id, action_type, target_user_id, details)
      VALUES (auth.uid(), 'admin_role_grant_failed', target_user_id, 
        jsonb_build_object('target_name', target_name, 'target_email', target_email, 
                          'success', false, 'error', 'Barbers cannot be granted admin privileges'));
      RAISE EXCEPTION 'Barbers cannot be granted admin privileges';
    END IF;
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Log successful activity
    INSERT INTO public.admin_activity_log (actor_id, action_type, target_user_id, details)
    VALUES (auth.uid(), 'admin_role_granted', target_user_id, 
      jsonb_build_object('target_name', target_name, 'target_email', target_email, 'success', true));
    
    RETURN true;
  ELSIF action = 'revoke' THEN
    DELETE FROM public.user_roles
    WHERE user_id = target_user_id AND role = 'admin';
    
    -- Log successful activity
    INSERT INTO public.admin_activity_log (actor_id, action_type, target_user_id, details)
    VALUES (auth.uid(), 'admin_role_revoked', target_user_id, 
      jsonb_build_object('target_name', target_name, 'target_email', target_email, 'success', true));
    
    RETURN true;
  ELSE
    -- Log invalid action
    INSERT INTO public.admin_activity_log (actor_id, action_type, target_user_id, details)
    VALUES (auth.uid(), 'admin_role_invalid_action', target_user_id, 
      jsonb_build_object('target_name', target_name, 'target_email', target_email, 
                        'success', false, 'error', 'Invalid action: ' || action));
    RAISE EXCEPTION 'Invalid action. Use grant or revoke';
  END IF;
END;
$function$;