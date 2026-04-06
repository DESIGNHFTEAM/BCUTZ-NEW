-- Create loyalty points table
CREATE TABLE public.loyalty_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  lifetime_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint on user_id
ALTER TABLE public.loyalty_points ADD CONSTRAINT loyalty_points_user_id_unique UNIQUE (user_id);

-- Enable RLS
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

-- Users can view their own points
CREATE POLICY "Users can view their own points" ON public.loyalty_points
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own points record
CREATE POLICY "Users can insert their own points" ON public.loyalty_points
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create loyalty transactions table for history
CREATE TABLE public.loyalty_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  points INTEGER NOT NULL,
  transaction_type TEXT NOT NULL, -- 'earned', 'redeemed', 'expired'
  description TEXT,
  booking_id UUID REFERENCES public.bookings(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own transactions
CREATE POLICY "Users can view their own loyalty transactions" ON public.loyalty_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Create trigger to update points on transaction
CREATE OR REPLACE FUNCTION public.update_loyalty_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure user has a points record
  INSERT INTO public.loyalty_points (user_id, points, lifetime_points)
  VALUES (NEW.user_id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Update points based on transaction type
  IF NEW.transaction_type = 'earned' THEN
    UPDATE public.loyalty_points 
    SET points = points + NEW.points,
        lifetime_points = lifetime_points + NEW.points,
        updated_at = now()
    WHERE user_id = NEW.user_id;
  ELSIF NEW.transaction_type = 'redeemed' OR NEW.transaction_type = 'expired' THEN
    UPDATE public.loyalty_points 
    SET points = GREATEST(0, points - ABS(NEW.points)),
        updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_loyalty_transaction
  AFTER INSERT ON public.loyalty_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_loyalty_points();

-- Create loyalty rewards table
CREATE TABLE public.loyalty_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL,
  discount_type TEXT NOT NULL, -- 'percentage', 'fixed'
  discount_value NUMERIC NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS - everyone can view active rewards
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active rewards" ON public.loyalty_rewards
  FOR SELECT USING (is_active = true);

-- Insert default rewards
INSERT INTO public.loyalty_rewards (name, description, points_required, discount_type, discount_value) VALUES
  ('5% Off', 'Get 5% off your next booking', 100, 'percentage', 5),
  ('10% Off', 'Get 10% off your next booking', 200, 'percentage', 10),
  ('CHF 5 Off', 'Get CHF 5 off your next booking', 150, 'fixed', 5),
  ('CHF 10 Off', 'Get CHF 10 off your next booking', 300, 'fixed', 10),
  ('Free Service', 'Get a free basic service', 500, 'percentage', 100);

-- Add points_earned column to bookings for tracking
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0;