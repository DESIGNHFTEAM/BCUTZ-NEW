-- Drop and recreate log_admin_activity function to fix return type
DROP FUNCTION IF EXISTS public.log_admin_activity(text, uuid, uuid, jsonb);

CREATE FUNCTION public.log_admin_activity(
  p_action_type text,
  p_target_user_id uuid DEFAULT NULL,
  p_target_barber_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_activity_log (
    actor_id,
    action_type,
    target_user_id,
    target_barber_id,
    details
  ) VALUES (
    auth.uid(),
    p_action_type,
    p_target_user_id,
    p_target_barber_id,
    p_details
  );
END;
$$;