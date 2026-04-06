-- 1. Remove the INSERT policy on loyalty_points that allows arbitrary point inserts
DROP POLICY IF EXISTS "Users can insert their own points" ON public.loyalty_points;

-- 2. Remove sensitive tables from Realtime publication
DO $$
BEGIN
  -- Check and remove each table from publication if present
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'barber_profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.barber_profiles;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.bookings;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.chat_messages;
  END IF;
END $$;