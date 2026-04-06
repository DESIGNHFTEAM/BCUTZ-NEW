-- Add INSERT policy for notifications (allow users to create notifications for themselves)
CREATE POLICY "Users can insert their own notifications"
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Also allow service role inserts via edge functions (this is broader for system notifications)
CREATE POLICY "Authenticated users can receive notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);