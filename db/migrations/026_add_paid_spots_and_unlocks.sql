-- Migration: 026_add_paid_spots_and_unlocks.sql
-- Paid vs free sticker spots with time-limited user unlocks

ALTER TABLE sticker_spots
  ADD COLUMN IF NOT EXISTS spot_type TEXT NOT NULL DEFAULT 'free'
    CHECK (spot_type IN ('free', 'paid')),
  ADD COLUMN IF NOT EXISTS price_huf INT NOT NULL DEFAULT 0
    CHECK (price_huf >= 0),
  ADD COLUMN IF NOT EXISTS is_paid BOOLEAN GENERATED ALWAYS AS (spot_type = 'paid') STORED;

CREATE TABLE IF NOT EXISTS paid_spot_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  spot_id UUID NOT NULL REFERENCES sticker_spots (id) ON DELETE CASCADE,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_paid_spot_unlocks_user_spot UNIQUE (user_id, spot_id),
  CONSTRAINT uq_paid_spot_unlocks_checkout_session UNIQUE (stripe_checkout_session_id)
);

CREATE INDEX IF NOT EXISTS idx_paid_spot_unlocks_user_expires
  ON paid_spot_unlocks (user_id, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_paid_spot_unlocks_spot_expires
  ON paid_spot_unlocks (spot_id, expires_at DESC);

ALTER TABLE paid_spot_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "paid_spot_unlocks_own_read" ON paid_spot_unlocks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "paid_spot_unlocks_service_insert" ON paid_spot_unlocks
  FOR INSERT WITH CHECK (false);

CREATE POLICY "paid_spot_unlocks_service_update" ON paid_spot_unlocks
  FOR UPDATE USING (false);

CREATE OR REPLACE FUNCTION update_paid_spot_unlocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_paid_spot_unlocks_updated_at ON paid_spot_unlocks;

CREATE TRIGGER trg_paid_spot_unlocks_updated_at
  BEFORE UPDATE ON paid_spot_unlocks
  FOR EACH ROW
  EXECUTE FUNCTION update_paid_spot_unlocks_updated_at();
