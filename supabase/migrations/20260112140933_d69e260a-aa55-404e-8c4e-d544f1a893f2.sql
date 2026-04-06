-- Create table to track reward redemptions (once per year limit)
CREATE TABLE public.reward_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    reward_id UUID NOT NULL REFERENCES public.loyalty_rewards(id) ON DELETE CASCADE,
    redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now())::INTEGER,
    UNIQUE(user_id, reward_id, year)
);

-- Enable RLS
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own redemptions
CREATE POLICY "Users can view own redemptions"
    ON public.reward_redemptions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can insert their own redemptions
CREATE POLICY "Users can insert own redemptions"
    ON public.reward_redemptions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Replace the redeem_loyalty_reward function to check once-per-year limit
CREATE OR REPLACE FUNCTION public.redeem_loyalty_reward(p_reward_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_points_required integer;
    v_user_points integer;
    v_current_year integer := EXTRACT(YEAR FROM now())::INTEGER;
    v_already_redeemed boolean;
    v_reward_name text;
BEGIN
    -- Check if user is authenticated
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Get reward details
    SELECT points_required, name INTO v_points_required, v_reward_name
    FROM loyalty_rewards
    WHERE id = p_reward_id AND is_active = true;

    IF v_points_required IS NULL THEN
        RAISE EXCEPTION 'Reward not found or inactive';
    END IF;

    -- Check if already redeemed this year
    SELECT EXISTS (
        SELECT 1 FROM reward_redemptions
        WHERE user_id = v_user_id
        AND reward_id = p_reward_id
        AND year = v_current_year
    ) INTO v_already_redeemed;

    IF v_already_redeemed THEN
        RAISE EXCEPTION 'You have already redeemed this reward this year. Each reward can only be used once per year.';
    END IF;

    -- Get user's current points
    SELECT points INTO v_user_points
    FROM loyalty_points
    WHERE user_id = v_user_id;

    IF v_user_points IS NULL OR v_user_points < v_points_required THEN
        RAISE EXCEPTION 'Not enough points';
    END IF;

    -- Deduct points
    UPDATE loyalty_points
    SET points = points - v_points_required,
        updated_at = now()
    WHERE user_id = v_user_id;

    -- Record the transaction
    INSERT INTO loyalty_transactions (user_id, points, transaction_type, description)
    VALUES (v_user_id, -v_points_required, 'redemption', 'Redeemed: ' || v_reward_name);

    -- Record the redemption for once-per-year tracking
    INSERT INTO reward_redemptions (user_id, reward_id, year)
    VALUES (v_user_id, p_reward_id, v_current_year);

    RETURN true;
END;
$$;