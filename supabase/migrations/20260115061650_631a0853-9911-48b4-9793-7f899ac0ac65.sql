-- Create vouchers table to store redeemed loyalty vouchers
CREATE TABLE IF NOT EXISTS public.vouchers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  reward_id UUID REFERENCES public.loyalty_rewards(id),
  discount_type VARCHAR(20) NOT NULL,
  discount_value NUMERIC NOT NULL,
  max_discount NUMERIC,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  used_on_booking_id UUID REFERENCES public.bookings(id),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

-- Users can view their own vouchers
CREATE POLICY "Users can view own vouchers"
  ON public.vouchers FOR SELECT
  USING (auth.uid() = user_id);

-- Add voucher tracking to bookings
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS voucher_id UUID REFERENCES public.vouchers(id),
ADD COLUMN IF NOT EXISTS voucher_discount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS customer_paid NUMERIC;

-- Create function to generate voucher code
CREATE OR REPLACE FUNCTION public.generate_voucher_code()
RETURNS VARCHAR(20)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars VARCHAR(36) := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result VARCHAR(20) := 'BCUTZ-';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * 36 + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;