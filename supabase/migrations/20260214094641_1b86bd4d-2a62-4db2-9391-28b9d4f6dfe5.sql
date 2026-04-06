-- Grant anonymous and authenticated users SELECT access to the barber_profiles_public view
GRANT SELECT ON public.barber_profiles_public TO anon;
GRANT SELECT ON public.barber_profiles_public TO authenticated;