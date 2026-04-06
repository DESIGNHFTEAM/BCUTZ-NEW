-- Enable realtime for bookings table to track status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;