-- Drop the overly permissive policy and rely on SECURITY DEFINER in the trigger
DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;