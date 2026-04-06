
-- ============================================
-- SECURITY FIX: Restrict all policies to authenticated users only
-- This prevents anonymous access attempts to sensitive data
-- ============================================

-- ============================================
-- FIX 1: PROFILES TABLE - Restrict to authenticated users
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Barbers can view customer profiles for their bookings" ON profiles;

-- Recreate with authenticated role restriction
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Barbers can view customer profiles for their bookings"
ON profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM bookings b
    JOIN barber_profiles bp ON b.barber_id = bp.id
    WHERE bp.user_id = auth.uid() AND b.customer_id = profiles.id
  )
);

-- ============================================
-- FIX 2: BARBER_PROFILES TABLE - Restrict to authenticated users
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Barbers can view their own full profile" ON barber_profiles;
DROP POLICY IF EXISTS "Barbers can insert their own profile" ON barber_profiles;
DROP POLICY IF EXISTS "Barbers can update their own profile" ON barber_profiles;
DROP POLICY IF EXISTS "Admins can view all barber profiles" ON barber_profiles;
DROP POLICY IF EXISTS "Admins can update barber profiles" ON barber_profiles;

-- Recreate with authenticated role restriction
CREATE POLICY "Barbers can view their own full profile"
ON barber_profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Barbers can insert their own profile"
ON barber_profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Barbers can update their own profile"
ON barber_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all barber profiles"
ON barber_profiles FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR is_founder(auth.uid()));

CREATE POLICY "Admins can update barber profiles"
ON barber_profiles FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR is_founder(auth.uid()));

-- ============================================
-- FIX 3: LOYALTY_REWARDS TABLE - Restrict public viewing to authenticated users
-- ============================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view active rewards" ON loyalty_rewards;

-- Recreate with authenticated role restriction
CREATE POLICY "Authenticated users can view active rewards"
ON loyalty_rewards FOR SELECT
TO authenticated
USING (is_active = true);
