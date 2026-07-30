-- Enables UUID helpers for Supabase
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.film_supports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  novella_slug TEXT NOT NULL,
  novella_title TEXT NOT NULL,
  supporter_name TEXT,
  amount INTEGER NOT NULL CHECK (amount >= 1000),
  currency TEXT NOT NULL DEFAULT 'huf',
  stripe_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'complete', 'failed')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS film_supports_status_idx ON public.film_supports (status);