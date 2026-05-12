-- Create hidden_spots table to track which spots are hidden by users
-- This is better than modifying sticker_spots schema
CREATE TABLE IF NOT EXISTS hidden_spots (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id             UUID NOT NULL REFERENCES sticker_spots (id) ON DELETE CASCADE,
  creator_id          UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(spot_id, creator_id)
);

CREATE INDEX IF NOT EXISTS idx_hidden_spots_creator_id ON hidden_spots (creator_id);
CREATE INDEX IF NOT EXISTS idx_hidden_spots_spot_id ON hidden_spots (spot_id);

-- RLS policies
ALTER TABLE hidden_spots ENABLE ROW LEVEL SECURITY;

-- Users can read their own hidden spots
CREATE POLICY "hidden_spots_own_read" ON hidden_spots
  FOR SELECT USING (auth.uid() = creator_id);

-- Users can insert their own hidden spots
CREATE POLICY "hidden_spots_own_insert" ON hidden_spots
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- Users can delete their own hidden spots
CREATE POLICY "hidden_spots_own_delete" ON hidden_spots
  FOR DELETE USING (auth.uid() = creator_id);
