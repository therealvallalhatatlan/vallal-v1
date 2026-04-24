-- Ensure unique nickname identities across shared surfaces (chat/feed/activity)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_nickname_unique
  ON users (nickname)
  WHERE nickname IS NOT NULL;
