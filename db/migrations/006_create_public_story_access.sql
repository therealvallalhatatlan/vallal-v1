-- Create table for tracking public story access with IP-based time limits
CREATE TABLE IF NOT EXISTS public.public_story_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  story_slug text NOT NULL,
  first_access_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  page_views integer DEFAULT 1,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Composite unique constraint: one 60-min session per IP+story
CREATE UNIQUE INDEX idx_public_access_ip_story 
  ON public.public_story_access(ip_hash, story_slug);

-- Index for cleanup queries
CREATE INDEX idx_public_access_expires 
  ON public.public_story_access(expires_at);

-- Index for IP lookups
CREATE INDEX idx_public_access_ip_hash 
  ON public.public_story_access(ip_hash);

-- Enable RLS (but allow all for now since it's public access tracking)
ALTER TABLE public.public_story_access ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access
CREATE POLICY "Service role has full access" ON public.public_story_access
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
