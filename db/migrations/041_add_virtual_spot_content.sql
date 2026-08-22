-- Extend existing sticker spots with virtual spot content metadata.
-- Existing rows remain physical through the default value.

ALTER TABLE sticker_spots
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'physical'
    CHECK (type IN ('physical', 'virtual')),
  ADD COLUMN IF NOT EXISTS content_type TEXT
    CHECK (content_type IN ('video', 'audio', 'image', 'text', 'link')),
  ADD COLUMN IF NOT EXISTS content_url TEXT;

