-- Update the default platform_fee from 1.00 to 2.00
ALTER TABLE public.bookings ALTER COLUMN platform_fee SET DEFAULT 2.00;
ALTER TABLE public.payments ALTER COLUMN platform_fee SET DEFAULT 2.00;

-- Update the validate_booking_price trigger function to use 2.00
CREATE OR REPLACE FUNCTION public.validate_booking_price()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_service_record RECORD;
  v_barber_exists BOOLEAN;
BEGIN
  -- Validate service exists and is active
  SELECT id, price, currency, barber_id, is_active INTO v_service_record
  FROM services 
  WHERE id = NEW.service_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service not found';
  END IF;
  
  IF NOT v_service_record.is_active THEN
    RAISE EXCEPTION 'Service is not active';
  END IF;
  
  -- Verify service belongs to the specified barber
  IF v_service_record.barber_id != NEW.barber_id THEN
    RAISE EXCEPTION 'Service does not belong to specified barber';
  END IF;
  
  -- Verify barber exists and is active
  SELECT EXISTS (
    SELECT 1 FROM barber_profiles 
    WHERE id = NEW.barber_id AND is_active = true
  ) INTO v_barber_exists;
  
  IF NOT v_barber_exists THEN
    RAISE EXCEPTION 'Barber profile not found or inactive';
  END IF;
  
  -- CRITICAL: Override client-submitted values with server-verified values
  NEW.service_price := v_service_record.price;
  NEW.currency := v_service_record.currency;
  NEW.platform_fee := 2.00; -- Fixed platform fee (CHF 2.00)
  
  -- Recalculate total amount server-side
  NEW.total_amount := NEW.service_price + NEW.platform_fee + COALESCE(NEW.klarna_fee, 0);
  
  RETURN NEW;
END;
$function$;