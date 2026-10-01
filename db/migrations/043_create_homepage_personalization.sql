CREATE TABLE IF NOT EXISTS homepage_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  path TEXT NOT NULL DEFAULT '/fooldal-2',
  source TEXT NOT NULL DEFAULT 'unknown',
  campaign TEXT,
  referrer_host TEXT,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_homepage_visits_user_time
  ON homepage_visits(user_id, visited_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_homepage_visits_session
  ON homepage_visits(user_id, session_id)
  WHERE session_id IS NOT NULL;

ALTER TABLE homepage_visits ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS homepage_memory (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_plan JSONB,
  last_session_id TEXT,
  last_hook TEXT,
  last_product_id TEXT,
  last_story_slug TEXT,
  last_generated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE homepage_memory ENABLE ROW LEVEL SECURITY;
