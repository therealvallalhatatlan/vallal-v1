-- Ensure gen_random_uuid() is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.story_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id text NOT NULL,
  source text,
  user_agent text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_story_reads_story_id ON public.story_reads (story_id);
CREATE INDEX IF NOT EXISTS idx_story_reads_source ON public.story_reads (source);
CREATE INDEX IF NOT EXISTS idx_story_reads_created_at ON public.story_reads (created_at);
