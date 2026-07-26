-- Migration: 030_add_vouchers_and_redemption.sql
-- Identity-disconnected voucher mint + redemption for phantom credits

CREATE TABLE IF NOT EXISTS vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_code TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL DEFAULT 'supporter_sticker',
  credits INT NOT NULL DEFAULT 1 CHECK (credits > 0),
  stripe_checkout_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  minted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  redeemed_at TIMESTAMPTZ,
  redeemed_by_session_id UUID REFERENCES shadow_profiles (session_id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_vouchers_redeemed_at
  ON vouchers (redeemed_at);

CREATE INDEX IF NOT EXISTS idx_vouchers_redeemed_by_session
  ON vouchers (redeemed_by_session_id);

ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vouchers_service_only_select" ON vouchers
  FOR SELECT USING (FALSE);

CREATE POLICY "vouchers_service_only_insert" ON vouchers
  FOR INSERT WITH CHECK (FALSE);

CREATE POLICY "vouchers_service_only_update" ON vouchers
  FOR UPDATE USING (FALSE);

CREATE OR REPLACE FUNCTION redeem_shadow_voucher(
  p_voucher_code TEXT,
  p_session_id UUID
)
RETURNS TABLE(ok BOOLEAN, credits_added INT, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_voucher vouchers%ROWTYPE;
BEGIN
  IF p_voucher_code IS NULL OR btrim(p_voucher_code) = '' THEN
    RETURN QUERY SELECT FALSE, 0, 'empty_voucher_code';
    RETURN;
  END IF;

  IF p_session_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'missing_session_id';
    RETURN;
  END IF;

  SELECT *
  INTO v_voucher
  FROM vouchers
  WHERE voucher_code = btrim(p_voucher_code)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 'invalid_voucher_code';
    RETURN;
  END IF;

  IF v_voucher.redeemed_at IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'voucher_already_redeemed';
    RETURN;
  END IF;

  UPDATE shadow_profiles
  SET drop_credits = drop_credits + v_voucher.credits
  WHERE session_id = p_session_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 'shadow_profile_not_found';
    RETURN;
  END IF;

  UPDATE vouchers
  SET
    redeemed_at = NOW(),
    redeemed_by_session_id = p_session_id
  WHERE id = v_voucher.id;

  RETURN QUERY SELECT TRUE, v_voucher.credits, 'ok';
END;
$$;
