-- Fix barber_banking_public_rls: Drop the overly permissive policy that exposes banking details
DROP POLICY IF EXISTS "Public can read active barber profiles for view" ON public.barber_profiles;

-- Fix loyalty_points_no_direct_updates: Add explicit denial policies for defense-in-depth
-- Explicitly prevent direct updates (only trigger can modify)
CREATE POLICY "Prevent direct point updates"
ON public.loyalty_points FOR UPDATE
USING (false);

-- Explicitly prevent deletions (points are permanent)
CREATE POLICY "Prevent point deletion"
ON public.loyalty_points FOR DELETE
USING (false);