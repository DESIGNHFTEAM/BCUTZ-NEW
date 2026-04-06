-- Fix booking_comments: Barbers should also be able to view and add comments on their bookings
DROP POLICY IF EXISTS "Users can view visible comments" ON public.booking_comments;
DROP POLICY IF EXISTS "Users can create own comments" ON public.booking_comments;

-- Users can view comments on bookings they're involved in
CREATE POLICY "Users can view comments on their bookings"
ON public.booking_comments FOR SELECT
USING (
  is_visible = true 
  OR auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM bookings b 
    WHERE b.id = booking_comments.booking_id 
    AND (b.customer_id = auth.uid() OR b.barber_id IN (
      SELECT bp.id FROM barber_profiles bp WHERE bp.user_id = auth.uid()
    ))
  )
);

-- Users can create comments on bookings they're involved in
CREATE POLICY "Users can create comments on their bookings"
ON public.booking_comments FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM bookings b 
    WHERE b.id = booking_comments.booking_id 
    AND (b.customer_id = auth.uid() OR b.barber_id IN (
      SELECT bp.id FROM barber_profiles bp WHERE bp.user_id = auth.uid()
    ))
  )
);

-- Fix profiles: Barbers need to see customer profiles for their bookings
CREATE POLICY "Barbers can view customer profiles for their bookings"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM bookings b
    JOIN barber_profiles bp ON b.barber_id = bp.id
    WHERE bp.user_id = auth.uid() AND b.customer_id = profiles.id
  )
);

-- Fix barber_profiles: Allow reviews to trigger rating updates via a secure function
-- Create a function to update barber ratings that runs with elevated privileges
CREATE OR REPLACE FUNCTION public.update_barber_rating_on_review()
RETURNS TRIGGER AS $$
DECLARE
  new_avg_rating NUMERIC;
  new_total_reviews INTEGER;
BEGIN
  -- Calculate new average rating and count
  SELECT AVG(rating)::NUMERIC, COUNT(*)::INTEGER
  INTO new_avg_rating, new_total_reviews
  FROM public.reviews
  WHERE barber_id = COALESCE(NEW.barber_id, OLD.barber_id);
  
  -- Update the barber profile
  UPDATE public.barber_profiles
  SET avg_rating = COALESCE(new_avg_rating, 0),
      total_reviews = COALESCE(new_total_reviews, 0),
      updated_at = now()
  WHERE id = COALESCE(NEW.barber_id, OLD.barber_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_update_barber_rating ON public.reviews;
CREATE TRIGGER trigger_update_barber_rating
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_barber_rating_on_review();

-- Fix reschedule_requests: Make sure customers can update their own pending requests
CREATE POLICY "Customers can update their pending reschedule requests"
ON public.reschedule_requests FOR UPDATE
USING (auth.uid() = customer_id AND status = 'pending')
WITH CHECK (auth.uid() = customer_id);

-- Add policy for customers to delete their reschedule requests
CREATE POLICY "Customers can delete their reschedule requests"
ON public.reschedule_requests FOR DELETE
USING (auth.uid() = customer_id);

-- Ensure barbers can insert comments on their bookings too
DROP POLICY IF EXISTS "Users can update own comments" ON public.booking_comments;
CREATE POLICY "Users can update own comments"
ON public.booking_comments FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);