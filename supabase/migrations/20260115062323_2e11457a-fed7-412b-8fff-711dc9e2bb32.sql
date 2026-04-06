-- Create referrals table to track referral codes and usage
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL UNIQUE,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referred_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'completed', 'rewarded')),
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  rewarded_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can view their own referrals (as referrer)
CREATE POLICY "Users can view their referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id);

-- Users can create referral invites
CREATE POLICY "Users can create referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (auth.uid() = referrer_id);

-- System can update referrals (via edge function with service role)
-- No direct user updates allowed for security

-- Create function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create function to get or create user's referral code
CREATE OR REPLACE FUNCTION public.get_or_create_referral_code()
RETURNS TEXT AS $$
DECLARE
  existing_code TEXT;
  new_code TEXT;
  max_attempts INTEGER := 10;
  attempts INTEGER := 0;
BEGIN
  -- Check if user already has a referral code (any referral they created)
  SELECT referral_code INTO existing_code
  FROM public.referrals
  WHERE referrer_id = auth.uid()
  LIMIT 1;
  
  IF existing_code IS NOT NULL THEN
    RETURN existing_code;
  END IF;
  
  -- Generate unique code
  LOOP
    new_code := generate_referral_code();
    attempts := attempts + 1;
    
    -- Check if code exists
    IF NOT EXISTS (SELECT 1 FROM public.referrals WHERE referral_code = new_code) THEN
      -- Insert a placeholder referral with this code
      INSERT INTO public.referrals (referrer_id, referral_code, status)
      VALUES (auth.uid(), new_code, 'pending');
      RETURN new_code;
    END IF;
    
    IF attempts >= max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique referral code';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to process referral when new user signs up
CREATE OR REPLACE FUNCTION public.process_referral_signup(p_referral_code TEXT)
RETURNS JSONB AS $$
DECLARE
  referral_record RECORD;
BEGIN
  -- Find the referral
  SELECT * INTO referral_record
  FROM public.referrals
  WHERE referral_code = p_referral_code
    AND status = 'pending'
    AND referred_user_id IS NULL
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid or already used referral code');
  END IF;
  
  -- Can't refer yourself
  IF referral_record.referrer_id = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cannot use your own referral code');
  END IF;
  
  -- Update the referral with the new user
  UPDATE public.referrals
  SET referred_user_id = auth.uid(),
      status = 'signed_up'
  WHERE id = referral_record.id;
  
  RETURN jsonb_build_object('success', true, 'message', 'Referral registered! Complete a booking to earn rewards.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to award referral points when booking is completed
CREATE OR REPLACE FUNCTION public.check_referral_completion()
RETURNS TRIGGER AS $$
DECLARE
  referral_record RECORD;
  referrer_points_record RECORD;
  referred_points_record RECORD;
  referral_bonus INTEGER := 50; -- Points for both parties
BEGIN
  -- Only process when status changes to completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Check if the customer has a pending referral
    SELECT * INTO referral_record
    FROM public.referrals
    WHERE referred_user_id = NEW.customer_id
      AND status = 'signed_up'
    LIMIT 1;
    
    IF FOUND THEN
      -- Update referral status
      UPDATE public.referrals
      SET status = 'completed',
          completed_at = now()
      WHERE id = referral_record.id;
      
      -- Award points to referrer
      INSERT INTO public.loyalty_points (user_id, points, lifetime_points)
      VALUES (referral_record.referrer_id, referral_bonus, referral_bonus)
      ON CONFLICT (user_id) DO UPDATE
      SET points = loyalty_points.points + referral_bonus,
          lifetime_points = loyalty_points.lifetime_points + referral_bonus,
          updated_at = now();
      
      -- Award points to referred user
      INSERT INTO public.loyalty_points (user_id, points, lifetime_points)
      VALUES (NEW.customer_id, referral_bonus, referral_bonus)
      ON CONFLICT (user_id) DO UPDATE
      SET points = loyalty_points.points + referral_bonus,
          lifetime_points = loyalty_points.lifetime_points + referral_bonus,
          updated_at = now();
      
      -- Log transactions
      INSERT INTO public.loyalty_transactions (user_id, points, transaction_type, description)
      VALUES 
        (referral_record.referrer_id, referral_bonus, 'referral_bonus', 'Referral bonus - Friend completed first booking'),
        (NEW.customer_id, referral_bonus, 'referral_bonus', 'Welcome bonus - First booking via referral');
      
      -- Mark as rewarded
      UPDATE public.referrals
      SET status = 'rewarded',
          points_awarded = referral_bonus,
          rewarded_at = now()
      WHERE id = referral_record.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on bookings table
DROP TRIGGER IF EXISTS trigger_check_referral_completion ON public.bookings;
CREATE TRIGGER trigger_check_referral_completion
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.check_referral_completion();

-- Add unique constraint on user_id for loyalty_points to support ON CONFLICT
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'loyalty_points_user_id_key'
  ) THEN
    ALTER TABLE public.loyalty_points ADD CONSTRAINT loyalty_points_user_id_key UNIQUE (user_id);
  END IF;
END $$;