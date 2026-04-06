-- Add business_type column to barber_profiles to distinguish between barbershops and beauty salons
ALTER TABLE public.barber_profiles 
ADD COLUMN IF NOT EXISTS business_type text NOT NULL DEFAULT 'barbershop' 
CHECK (business_type IN ('barbershop', 'salon'));