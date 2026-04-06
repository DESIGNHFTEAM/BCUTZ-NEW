-- ============================================
-- SECURITY FIX: Server-side price validation for bookings
-- ============================================

-- 1. Add CHECK constraints on prices
ALTER TABLE services ADD CONSTRAINT services_price_positive 
  CHECK (price > 0 AND price < 100000);

ALTER TABLE services ADD CONSTRAINT services_duration_valid
  CHECK (duration_minutes > 0 AND duration_minutes <= 480);

ALTER TABLE bookings ADD CONSTRAINT bookings_price_positive
  CHECK (service_price > 0 AND total_amount > 0);

ALTER TABLE bookings ADD CONSTRAINT bookings_platform_fee_fixed
  CHECK (platform_fee = 1.00);

-- 2. Add text field length constraints
ALTER TABLE barber_profiles ADD CONSTRAINT barber_shop_name_length 
  CHECK (length(shop_name) >= 2 AND length(shop_name) <= 100);

ALTER TABLE barber_profiles ADD CONSTRAINT barber_description_length 
  CHECK (description IS NULL OR length(description) <= 2000);

ALTER TABLE services ADD CONSTRAINT service_name_length
  CHECK (length(name) >= 1 AND length(name) <= 100);

ALTER TABLE services ADD CONSTRAINT service_description_length
  CHECK (description IS NULL OR length(description) <= 500);

-- 3. Create booking price validation trigger (CRITICAL FIX)
CREATE OR REPLACE FUNCTION public.validate_booking_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  NEW.platform_fee := 1.00; -- Fixed platform fee
  
  -- Recalculate total amount server-side
  NEW.total_amount := NEW.service_price + NEW.platform_fee + COALESCE(NEW.klarna_fee, 0);
  
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER validate_booking_price_trigger
BEFORE INSERT OR UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION public.validate_booking_price();

-- 4. Restrict has_role function to prevent cross-user role enumeration
-- Keep existing function for RLS policies but revoke direct public execute
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, app_role) FROM authenticated;

-- Grant back to postgres for policy use (internal only)
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO postgres;

-- Create a safe wrapper for current user only (for client use if needed)
CREATE OR REPLACE FUNCTION public.current_user_has_role(_role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), _role)
$$;

-- Grant execute to authenticated users for the safe wrapper
GRANT EXECUTE ON FUNCTION public.current_user_has_role(app_role) TO authenticated;