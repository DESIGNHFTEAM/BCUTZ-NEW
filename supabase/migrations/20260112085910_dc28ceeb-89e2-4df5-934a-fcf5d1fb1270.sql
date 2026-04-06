-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can receive notifications" ON public.notifications;

-- Instead, allow admins and founders to create notifications for any user
CREATE POLICY "Admins can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR is_founder(auth.uid())
);