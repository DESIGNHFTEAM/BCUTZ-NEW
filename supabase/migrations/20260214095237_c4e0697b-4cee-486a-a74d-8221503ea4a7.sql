-- =============================================================
-- FIX 1: Remove overly permissive public SELECT on barber_profiles
-- The barber_profiles_public VIEW should be the only public access path
-- =============================================================

-- Drop the policy that exposes ALL columns (including bank_iban, stripe_account_id)
DROP POLICY IF EXISTS "Anyone can view public barber profiles" ON public.barber_profiles;

-- =============================================================
-- FIX 2: Fix race condition in redeem_loyalty_reward
-- Use SELECT FOR UPDATE and reorder INSERT to rely on UNIQUE constraint
-- =============================================================

CREATE OR REPLACE FUNCTION public.redeem_loyalty_reward(p_reward_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id uuid := auth.uid();
    v_points_required integer;
    v_user_points integer;
    v_current_year integer := EXTRACT(YEAR FROM now())::INTEGER;
    v_reward_name text;
    v_discount_type text;
    v_discount_value numeric;
    v_voucher_code varchar(20);
    v_voucher_id uuid;
BEGIN
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

    -- Lock the user's points row to prevent concurrent redemptions
    SELECT points INTO v_user_points
    FROM loyalty_points
    WHERE user_id = v_user_id
    FOR UPDATE;

    IF v_user_points IS NULL OR v_user_points < v_points_required THEN
        RAISE EXCEPTION 'Not enough points';
    END IF;

    -- Insert redemption FIRST - relies on UNIQUE(user_id, reward_id, year) to prevent duplicates
    -- If a concurrent call already inserted, this will fail with a unique violation
    BEGIN
        INSERT INTO reward_redemptions (user_id, reward_id, year)
        VALUES (v_user_id, p_reward_id, v_current_year);
    EXCEPTION WHEN unique_violation THEN
        RAISE EXCEPTION 'You have already redeemed this reward this year';
    END;

    -- Generate unique voucher code
    LOOP
        v_voucher_code := generate_voucher_code();
        EXIT WHEN NOT EXISTS (SELECT 1 FROM vouchers WHERE code = v_voucher_code);
    END LOOP;

    -- Create the voucher
    INSERT INTO vouchers (user_id, code, reward_id, discount_type, discount_value)
    VALUES (v_user_id, v_voucher_code, p_reward_id, v_discount_type, v_discount_value)
    RETURNING id INTO v_voucher_id;

    -- Deduct points (row is already locked via FOR UPDATE)
    UPDATE loyalty_points
    SET points = points - v_points_required,
        updated_at = now()
    WHERE user_id = v_user_id;

    -- Record the transaction
    INSERT INTO loyalty_transactions (user_id, points, transaction_type, description)
    VALUES (v_user_id, -v_points_required, 'redeemed', 'Redeemed: ' || v_reward_name);

    RETURN jsonb_build_object(
        'success', true,
        'voucher_code', v_voucher_code,
        'voucher_id', v_voucher_id,
        'discount_type', v_discount_type,
        'discount_value', v_discount_value,
        'expires_at', (now() + interval '30 days')::text
    );
END;
$function$;

-- =============================================================
-- FIX 3: Storage upload restrictions
-- Add file size limits and avatar file type validation
-- =============================================================

-- Update storage buckets with file size limits
UPDATE storage.buckets 
SET file_size_limit = 10485760  -- 10MB for images
WHERE id = 'avatars';

UPDATE storage.buckets 
SET file_size_limit = 10485760  -- 10MB for gallery images
WHERE id = 'gallery';

UPDATE storage.buckets 
SET file_size_limit = 52428800  -- 50MB for videos
WHERE id = 'videos';

-- Add file type validation to avatar uploads
-- First drop existing avatar upload policy if any
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND LOWER(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'gif', 'avif')
);