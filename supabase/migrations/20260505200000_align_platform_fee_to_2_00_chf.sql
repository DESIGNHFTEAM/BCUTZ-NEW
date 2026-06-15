-- Align platform_fee with App Store + i18n copy (CHF 2.00).
-- Atomic: drop old constraint, update function, set defaults, add new constraint.
--
-- Context: pre-existing migration 20260214092841 attempted to bump the fee from
-- 1.00 → 2.00 but only updated the function — leaving the bookings_platform_fee_fixed
-- CHECK constraint at 1.00. Applying that migration alone would have BROKEN every
-- booking insert (constraint violation). This migration completes the bump correctly.
-- Verified via smoke test: malicious 0.01 input → service_price=45.00, fee=2.00, total=47.00.

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_platform_fee_fixed;

ALTER TABLE public.bookings ALTER COLUMN platform_fee SET DEFAULT 2.00;
ALTER TABLE public.payments ALTER COLUMN platform_fee SET DEFAULT 2.00;

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
  SELECT id, price, currency, barber_id, is_active INTO v_service_record
  FROM services WHERE id = NEW.service_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Service not found'; END IF;
  IF NOT v_service_record.is_active THEN RAISE EXCEPTION 'Service is not active'; END IF;
  IF v_service_record.barber_id != NEW.barber_id THEN
    RAISE EXCEPTION 'Service does not belong to specified barber';
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM barber_profiles
    WHERE id = NEW.barber_id AND is_active = true
  ) INTO v_barber_exists;
  IF NOT v_barber_exists THEN RAISE EXCEPTION 'Barber profile not found or inactive'; END IF;

  -- CRITICAL: Override client-submitted values with server-verified values
  NEW.service_price := v_service_record.price;
  NEW.currency := v_service_record.currency;
  NEW.platform_fee := 2.00; -- Fixed platform fee (CHF 2.00) — must match Terms of Service + App Store copy
  NEW.total_amount := NEW.service_price + NEW.platform_fee + COALESCE(NEW.klarna_fee, 0);

  RETURN NEW;
END;
$$;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_platform_fee_fixed CHECK (platform_fee = 2.00);
