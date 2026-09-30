CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_badges (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_id
  ON user_badges(user_id);

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Badges are publicly readable" ON badges;
CREATE POLICY "Badges are publicly readable"
  ON badges
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can read own badges" ON user_badges;
CREATE POLICY "Users can read own badges"
  ON user_badges
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

INSERT INTO badges (code, name, description, sort_order)
VALUES
  ('first_book', 'ELSŐ KÖNYV', 'Az első könyv tulajdonosa.', 10),
  ('second_book', 'MÁSODIK KÖNYV', 'A második könyv tulajdonosa.', 20),
  ('mecenas', 'MECÉNÁS', 'Közvetlen támogatást fizetett.', 30),
  ('founder', 'ALAPÍTÓ', '45 000 Ft feletti összesített aktivitás.', 40),
  ('merch', 'MERCH', 'Vállalhatatlan merch tulajdonosa.', 50)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;
