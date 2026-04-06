-- Add preferred_currency column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN preferred_currency TEXT DEFAULT 'CHF';

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.preferred_currency IS 'User preferred payment currency (CHF, EUR, USD, GBP, etc.)';