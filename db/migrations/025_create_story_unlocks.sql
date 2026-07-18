CREATE TABLE IF NOT EXISTS public.story_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_slug text NOT NULL,
  email text NOT NULL,
  normalized_email text NOT NULL,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_story_unlocks_email_slug
  ON public.story_unlocks(normalized_email, story_slug);

CREATE INDEX IF NOT EXISTS idx_story_unlocks_story_slug
  ON public.story_unlocks(story_slug);

CREATE INDEX IF NOT EXISTS idx_story_unlocks_created_at
  ON public.story_unlocks(created_at DESC);

ALTER TABLE public.story_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to story unlocks" ON public.story_unlocks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);