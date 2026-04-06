-- Add policy to allow admins and founders to update barber profiles (for verification)
CREATE POLICY "Admins can update barber profiles" 
ON public.barber_profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR is_founder(auth.uid()));