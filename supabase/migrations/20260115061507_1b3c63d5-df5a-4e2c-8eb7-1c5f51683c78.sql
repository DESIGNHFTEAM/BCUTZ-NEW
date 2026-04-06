-- Drop the old function with boolean return type
DROP FUNCTION IF EXISTS public.redeem_loyalty_reward(uuid);

-- Create the new function that returns jsonb with voucher details
CREATE OR REPLACE FUNCTION public.redeem_loyalty_reward(p_reward_id uuid)
RETURNS jsonb
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
    v_discount_type text;
    v_discount_value numeric;
    v_voucher_code varchar(20);
    v_voucher_id uuid;
BEGIN
    -- Check if user is authenticated
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Get reward details
    SELECT points_required, name, discount_type, discount_value 
    INTO v_points_required, v_reward_name, v_discount_type, v_discount_value
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
        RAISE EXCEPTION 'You have already redeemed this reward this year';
    END IF;

    -- Get user's current points
    SELECT points INTO v_user_points
    FROM loyalty_points
    WHERE user_id = v_user_id;

    IF v_user_points IS NULL OR v_user_points < v_points_required THEN
        RAISE EXCEPTION 'Not enough points';
    END IF;

    -- Generate unique voucher code
    LOOP
        v_voucher_code := generate_voucher_code();
        EXIT WHEN NOT EXISTS (SELECT 1 FROM vouchers WHERE code = v_voucher_code);
    END LOOP;

    -- Create the voucher
    INSERT INTO vouchers (user_id, code, reward_id, discount_type, discount_value)
    VALUES (v_user_id, v_voucher_code, p_reward_id, v_discount_type, v_discount_value)
    RETURNING id INTO v_voucher_id;

    -- Deduct points
    UPDATE loyalty_points
    SET points = points - v_points_required,
        updated_at = now()
    WHERE user_id = v_user_id;

    -- Record the transaction
    INSERT INTO loyalty_transactions (user_id, points, transaction_type, description)
    VALUES (v_user_id, -v_points_required, 'redeemed', 'Redeemed: ' || v_reward_name);

    -- Record the redemption for once-per-year tracking
    INSERT INTO reward_redemptions (user_id, reward_id, year)
    VALUES (v_user_id, p_reward_id, v_current_year);

    -- Return voucher details
    RETURN jsonb_build_object(
        'success', true,
        'voucher_code', v_voucher_code,
        'voucher_id', v_voucher_id,
        'discount_type', v_discount_type,
        'discount_value', v_discount_value,
        'expires_at', (now() + interval '30 days')::text
    );
END;
$$;