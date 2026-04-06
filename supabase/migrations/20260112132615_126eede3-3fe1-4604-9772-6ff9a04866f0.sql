-- Add a policy to allow anyone to view active and verified barber profiles (public data only)
CREATE POLICY "Anyone can view active verified barber profiles"
ON public.barber_profiles
FOR SELECT
USING (is_verified = true AND is_active = true);