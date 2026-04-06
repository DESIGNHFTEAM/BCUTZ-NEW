-- Assign Natnael (natnael_ermias@yahoo.com) as founder
INSERT INTO public.user_roles (user_id, role)
VALUES ('647f78fb-dc19-4c74-a7f8-c044247da621', 'founder')
ON CONFLICT (user_id, role) DO NOTHING;

-- Create founder_settings table for founder-specific configurations
CREATE TABLE IF NOT EXISTS public.founder_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  is_super_founder boolean DEFAULT true,
  override_powers boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on founder_settings
ALTER TABLE public.founder_settings ENABLE ROW LEVEL SECURITY;

-- Only founders can access their own settings
CREATE POLICY "Founders can view own settings"
  ON public.founder_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Founders can update own settings"
  ON public.founder_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Insert Natnael as super-founder
INSERT INTO public.founder_settings (user_id, is_super_founder, override_powers)
VALUES ('647f78fb-dc19-4c74-a7f8-c044247da621', true, true)
ON CONFLICT (user_id) DO UPDATE SET is_super_founder = true, override_powers = true;

-- Create booking_comments table for customer comments/feedback
CREATE TABLE IF NOT EXISTS public.booking_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  comment text NOT NULL,
  is_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.booking_comments ENABLE ROW LEVEL SECURITY;

-- Comments policies
CREATE POLICY "Users can view visible comments"
  ON public.booking_comments FOR SELECT
  USING (is_visible = true OR auth.uid() = user_id);

CREATE POLICY "Users can create own comments"
  ON public.booking_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON public.booking_comments FOR UPDATE
  USING (auth.uid() = user_id);

-- Create reschedule_requests table
CREATE TABLE IF NOT EXISTS public.reschedule_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  requested_date date NOT NULL,
  requested_time time NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  barber_response text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reschedule_requests ENABLE ROW LEVEL SECURITY;

-- Reschedule request policies
CREATE POLICY "Customers can view own reschedule requests"
  ON public.reschedule_requests FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Customers can create reschedule requests"
  ON public.reschedule_requests FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Barbers can view reschedule requests for their bookings"
  ON public.reschedule_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN barber_profiles bp ON b.barber_id = bp.id
      WHERE b.id = reschedule_requests.booking_id
      AND bp.user_id = auth.uid()
    )
  );

CREATE POLICY "Barbers can update reschedule requests for their bookings"
  ON public.reschedule_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN barber_profiles bp ON b.barber_id = bp.id
      WHERE b.id = reschedule_requests.booking_id
      AND bp.user_id = auth.uid()
    )
  );

-- Create founder action log for auditing
CREATE TABLE IF NOT EXISTS public.founder_action_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id uuid NOT NULL,
  action_type text NOT NULL,
  target_type text,
  target_id uuid,
  details jsonb,
  is_reversible boolean DEFAULT false,
  reversed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.founder_action_log ENABLE ROW LEVEL SECURITY;

-- Only founders can view all actions
CREATE POLICY "Founders can view all founder actions"
  ON public.founder_action_log FOR SELECT
  USING (is_founder(auth.uid()));

CREATE POLICY "Founders can create founder actions"
  ON public.founder_action_log FOR INSERT
  WITH CHECK (auth.uid() = founder_id AND is_founder(auth.uid()));

CREATE POLICY "Founders can update founder actions"
  ON public.founder_action_log FOR UPDATE
  USING (is_founder(auth.uid()));

-- Create function to check if user is super founder
CREATE OR REPLACE FUNCTION public.is_super_founder(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM founder_settings
    WHERE user_id = _user_id AND is_super_founder = true
  )
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_super_founder(uuid) TO authenticated;