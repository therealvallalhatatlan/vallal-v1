-- Migration: 015_create_matrica_sticker_hunt.sql
-- Location-based sticker hunt feature

-- ──────────────────────────────────────────────
-- 1. sticker_spots
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sticker_spots (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               TEXT NOT NULL,
  description         TEXT,
  image_url           TEXT,
  lat                 FLOAT8 NOT NULL,
  lng                 FLOAT8 NOT NULL,
  radius_visibility   INT NOT NULL DEFAULT 500,   -- meters: spot becomes visible to nearby users
  radius_claim        INT NOT NULL DEFAULT 50,    -- meters: user must be within this to claim
  total_quantity      INT NOT NULL DEFAULT 1,
  remaining_quantity  INT NOT NULL DEFAULT 1,
  status              TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'empty', 'archived')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Spatial-ish indexes on lat/lng for bounding-box pre-filters
CREATE INDEX IF NOT EXISTS idx_sticker_spots_lat ON sticker_spots (lat);
CREATE INDEX IF NOT EXISTS idx_sticker_spots_lng ON sticker_spots (lng);
CREATE INDEX IF NOT EXISTS idx_sticker_spots_status ON sticker_spots (status);

-- ──────────────────────────────────────────────
-- 2. claims
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS claims (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  spot_id         UUID NOT NULL REFERENCES sticker_spots (id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'rejected')),
  user_image_url  TEXT,
  comment         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each user can claim a given spot at most once
  CONSTRAINT uq_claims_user_spot UNIQUE (user_id, spot_id)
);

CREATE INDEX IF NOT EXISTS idx_claims_user_id ON claims (user_id);
CREATE INDEX IF NOT EXISTS idx_claims_spot_id ON claims (spot_id);

-- ──────────────────────────────────────────────
-- 3. RLS policies
-- ──────────────────────────────────────────────
ALTER TABLE sticker_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

-- Spots: anyone (including anon) can read active spots
CREATE POLICY "spots_public_read" ON sticker_spots
  FOR SELECT USING (status = 'active');

-- Spots: only service role can insert/update/delete (managed via admin panel or migrations)
-- (no explicit INSERT/UPDATE/DELETE policy = service role bypass handles it)

-- Claims: authenticated users can read their own claims
CREATE POLICY "claims_own_read" ON claims
  FOR SELECT USING (auth.uid() = user_id);

-- Claims: authenticated users can insert their own claims
CREATE POLICY "claims_own_insert" ON claims
  FOR INSERT WITH CHECK (auth.uid() = user_id);
