-- Create secure RPC function for loyalty reward redemptions
-- This prevents users from manipulating points by inserting arbitrary transactions
CREATE OR REPLACE FUNCTION public.redeem_loyalty_reward(p_reward_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points_required INTEGER;
  v_reward_name TEXT;
  v_user_points INTEGER;
  v_user_id UUID;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Get reward details (verify it exists and is active)
  SELECT points_required, name INTO v_points_required, v_reward_name
  FROM loyalty_rewards
  WHERE id = p_reward_id AND is_active = true;
  
  IF v_points_required IS NULL THEN
    RAISE EXCEPTION 'Invalid or inactive reward';
  END IF;
  
  -- Get user's current points
  SELECT points INTO v_user_points
  FROM loyalty_points
  WHERE user_id = v_user_id;
  
  IF v_user_points IS NULL OR v_user_points < v_points_required THEN
    RAISE EXCEPTION 'Insufficient points';
  END IF;
  
  -- Insert redemption transaction (trigger will update points)
  INSERT INTO loyalty_transactions (user_id, points, transaction_type, description)
  VALUES (v_user_id, -v_points_required, 'redeemed', 'Redeemed: ' || v_reward_name);
  
  RETURN true;
END;
$$;

-- Grant execute permission to authenticated users only
GRANT EXECUTE ON FUNCTION public.redeem_loyalty_reward(UUID) TO authenticated;