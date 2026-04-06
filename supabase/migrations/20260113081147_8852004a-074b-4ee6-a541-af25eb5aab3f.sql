-- Fix security definer view issue by changing to security_invoker
-- This ensures the view respects the caller's permissions, not the definer's
ALTER VIEW public.barber_profiles_public SET (security_invoker = on);