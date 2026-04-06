-- Add min_tier column to loyalty_rewards for tier-exclusive rewards
ALTER TABLE public.loyalty_rewards 
ADD COLUMN IF NOT EXISTS min_tier text DEFAULT NULL 
CHECK (min_tier IS NULL OR min_tier IN ('bronze', 'silver', 'gold', 'platinum'));

-- Add birthday column to profiles for birthday bonus
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS birthday date DEFAULT NULL;

-- Create a table to track birthday bonuses awarded (to prevent duplicate awards)
CREATE TABLE IF NOT EXISTS public.birthday_bonus_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  year integer NOT NULL,
  points_awarded integer NOT NULL,
  awarded_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, year)
);

-- Enable RLS on birthday_bonus_log
ALTER TABLE public.birthday_bonus_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own birthday bonuses
CREATE POLICY "Users can view their own birthday bonuses" 
ON public.birthday_bonus_log 
FOR SELECT 
USING (auth.uid() = user_id);

-- Insert some tier-exclusive rewards
INSERT INTO public.loyalty_rewards (name, description, points_required, discount_type, discount_value, min_tier, is_active)
VALUES 
  ('Silver VIP 15% Off', 'Exclusive 15% discount for Silver members and above', 150, 'percentage', 15, 'silver', true),
  ('Gold Priority Booking', 'Priority booking slot access + 20% off', 250, 'percentage', 20, 'gold', true),
  ('Platinum Free Premium Service', 'Free premium service for Platinum members', 400, 'percentage', 100, 'platinum', true)
ON CONFLICT DO NOTHING;