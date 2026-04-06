-- Create trigger function for reschedule request notifications
CREATE OR REPLACE FUNCTION public.notify_on_reschedule_request()
RETURNS TRIGGER AS $$
DECLARE
  v_barber_user_id uuid;
  v_customer_name text;
  v_booking_date date;
  v_booking_time text;
  v_shop_name text;
BEGIN
  -- Get booking details
  SELECT b.booking_date, b.start_time, bp.user_id, bp.shop_name
  INTO v_booking_date, v_booking_time, v_barber_user_id, v_shop_name
  FROM bookings b
  JOIN barber_profiles bp ON b.barber_id = bp.id
  WHERE b.id = NEW.booking_id;
  
  -- Get customer name
  SELECT full_name INTO v_customer_name
  FROM profiles
  WHERE id = NEW.customer_id;
  
  -- On INSERT: Notify barber about new reschedule request
  IF TG_OP = 'INSERT' THEN
    INSERT INTO notifications (user_id, title, message, type, action_url)
    VALUES (
      v_barber_user_id,
      'Reschedule Request',
      COALESCE(v_customer_name, 'A customer') || ' requested to reschedule their booking on ' || 
      to_char(v_booking_date, 'Mon DD') || ' to ' || to_char(NEW.requested_date, 'Mon DD') || ' at ' || 
      NEW.requested_time::text,
      'booking',
      '/bookings'
    );
  END IF;
  
  -- On UPDATE: Notify customer about status change
  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status IN ('approved', 'denied') THEN
    INSERT INTO notifications (user_id, title, message, type, action_url)
    VALUES (
      NEW.customer_id,
      CASE WHEN NEW.status = 'approved' THEN 'Reschedule Approved' ELSE 'Reschedule Declined' END,
      CASE 
        WHEN NEW.status = 'approved' THEN 
          'Your reschedule request for ' || v_shop_name || ' has been approved! New time: ' || 
          to_char(NEW.requested_date, 'Mon DD') || ' at ' || NEW.requested_time::text
        ELSE 
          'Your reschedule request for ' || v_shop_name || ' was declined.' || 
          CASE WHEN NEW.barber_response IS NOT NULL THEN ' Reason: ' || NEW.barber_response ELSE '' END
      END,
      'booking',
      '/bookings'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_notify_reschedule ON reschedule_requests;
CREATE TRIGGER trigger_notify_reschedule
AFTER INSERT OR UPDATE ON reschedule_requests
FOR EACH ROW
EXECUTE FUNCTION notify_on_reschedule_request();

-- Allow service role to insert notifications (for triggers)
CREATE POLICY "Service role can insert notifications"
ON notifications FOR INSERT
WITH CHECK (true);

-- Add policy for viewing reviews for barbers (they may need to see which to reply to)
CREATE POLICY "Barbers can view reviews for their shop"
ON reviews FOR SELECT
USING (
  barber_id IN (
    SELECT id FROM barber_profiles WHERE user_id = auth.uid()
  )
);