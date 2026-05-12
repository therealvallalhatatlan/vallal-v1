-- Add creator tracking and hidden status to sticker_spots
ALTER TABLE sticker_spots
ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_sticker_spots_creator_id ON sticker_spots (creator_id);
CREATE INDEX IF NOT EXISTS idx_sticker_spots_is_hidden ON sticker_spots (is_hidden);
