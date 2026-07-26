-- Migration: 027_create_shadow_profiles_and_drops.sql
-- Phantom layer core schema (session-centric identity)

CREATE TABLE IF NOT EXISTS shadow_profiles (
  session_id UUID PRIMARY KEY,
  sponsor_id UUID REFERENCES shadow_profiles (session_id) ON DELETE SET NULL,
  insider_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  drop_credits INT NOT NULL DEFAULT 0 CHECK (drop_credits >= 0),
  burn_now BOOLEAN NOT NULL DEFAULT FALSE,
  banned_at TIMESTAMPTZ,
  burn_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT shadow_profiles_sponsor_not_self CHECK (sponsor_id IS NULL OR sponsor_id <> session_id)
);

CREATE INDEX IF NOT EXISTS idx_shadow_profiles_sponsor_id
  ON shadow_profiles (sponsor_id);

CREATE INDEX IF NOT EXISTS idx_shadow_profiles_insider_enabled
  ON shadow_profiles (insider_enabled);

CREATE OR REPLACE FUNCTION shadow_profiles_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_shadow_profiles_updated_at ON shadow_profiles;

CREATE TRIGGER trg_shadow_profiles_updated_at
  BEFORE UPDATE ON shadow_profiles
  FOR EACH ROW
  EXECUTE FUNCTION shadow_profiles_set_updated_at();

CREATE TABLE IF NOT EXISTS shadow_drops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_name TEXT NOT NULL,
  lat FLOAT8 NOT NULL,
  lng FLOAT8 NOT NULL,
  geofence_meters INT NOT NULL DEFAULT 120 CHECK (geofence_meters > 0),
  is_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  claimed_at TIMESTAMPTZ,
  claimed_by_session_id UUID REFERENCES shadow_profiles (session_id) ON DELETE SET NULL,
  burn_after TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shadow_drops_is_claimed
  ON shadow_drops (is_claimed, claimed_at);

CREATE INDEX IF NOT EXISTS idx_shadow_drops_claimed_by
  ON shadow_drops (claimed_by_session_id);

CREATE TABLE IF NOT EXISTS shadow_drop_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id UUID NOT NULL REFERENCES shadow_drops (id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES shadow_profiles (session_id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT uq_shadow_drop_claims_drop UNIQUE (drop_id),
  CONSTRAINT uq_shadow_drop_claims_drop_session UNIQUE (drop_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_shadow_drop_claims_claimed_at
  ON shadow_drop_claims (claimed_at);

CREATE INDEX IF NOT EXISTS idx_shadow_drop_claims_session
  ON shadow_drop_claims (session_id, claimed_at DESC);
