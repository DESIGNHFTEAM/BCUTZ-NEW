-- Create activity log table for tracking admin/founder actions
CREATE TABLE public.admin_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action_type text NOT NULL,
  target_user_id uuid,
  target_barber_id uuid,
  details jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for common queries
CREATE INDEX idx_admin_activity_log_actor ON public.admin_activity_log(actor_id);
CREATE INDEX idx_admin_activity_log_created ON public.admin_activity_log(created_at DESC);
CREATE INDEX idx_admin_activity_log_action ON public.admin_activity_log(action_type);

-- Enable RLS
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Founders can view all activity logs
CREATE POLICY "Founders can view all activity logs"
ON public.admin_activity_log
FOR SELECT
USING (public.is_founder(auth.uid()));

-- Admins and founders can insert activity logs
CREATE POLICY "Admins and founders can insert activity logs"
ON public.admin_activity_log
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.is_founder(auth.uid())
);

-- Create a function to log admin activity
CREATE OR REPLACE FUNCTION public.log_admin_activity(
  p_action_type text,
  p_target_user_id uuid DEFAULT NULL,
  p_target_barber_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.admin_activity_log (actor_id, action_type, target_user_id, target_barber_id, details)
  VALUES (auth.uid(), p_action_type, p_target_user_id, p_target_barber_id, p_details)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;