-- Allow anonymous and authenticated users to SELECT from the barber_profiles_public view
-- This view already filters to only verified and active barbers, excluding sensitive data
CREATE POLICY "Anyone can view public barber profiles"
ON public.barber_profiles
FOR SELECT
USING (is_verified = true AND is_active = true);
