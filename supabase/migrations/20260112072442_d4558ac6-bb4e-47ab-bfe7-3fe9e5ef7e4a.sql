-- Add stripe_account_id to barber_profiles for Stripe Connect payouts
ALTER TABLE public.barber_profiles 
ADD COLUMN IF NOT EXISTS stripe_account_id text,
ADD COLUMN IF NOT EXISTS stripe_onboarding_complete boolean DEFAULT false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_barber_profiles_stripe_account 
ON public.barber_profiles(stripe_account_id) 
WHERE stripe_account_id IS NOT NULL;