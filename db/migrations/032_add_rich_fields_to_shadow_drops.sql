-- Migration: 032_add_rich_fields_to_shadow_drops.sql
-- Extend Phantom drops with richer presentation fields

ALTER TABLE shadow_drops
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS location_hint TEXT;

UPDATE shadow_drops
SET title = COALESCE(NULLIF(title, ''), code_name)
WHERE title IS NULL OR title = '';

ALTER TABLE shadow_drops
  ALTER COLUMN title SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shadow_drops_created_at_desc
  ON shadow_drops (created_at DESC);
