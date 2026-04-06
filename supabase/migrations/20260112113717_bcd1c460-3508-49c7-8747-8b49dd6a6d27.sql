
-- Fix the security definer view issue by setting security_invoker
ALTER VIEW public.barber_profiles_public SET (security_invoker = on);
