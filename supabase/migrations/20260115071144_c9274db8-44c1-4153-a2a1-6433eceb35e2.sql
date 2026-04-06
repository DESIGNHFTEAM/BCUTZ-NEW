-- Create a function to get public stats (user count) without authentication
CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS TABLE(user_count bigint, barber_count bigint, avg_rating numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    (SELECT COUNT(*) FROM profiles) as user_count,
    (SELECT COUNT(*) FROM barber_profiles WHERE is_active = true AND is_verified = true) as barber_count,
    (SELECT COALESCE(AVG(avg_rating), 5.0) FROM barber_profiles WHERE is_active = true AND avg_rating > 0) as avg_rating;
$$;