-- Migration: 042_create_notifications_table.sql
-- Persistent notification/inbox objects

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('network','message')),
  title text NOT NULL,
  body text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON notifications (user_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_service_role_all
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (true);

CREATE POLICY notifications_user_select
  FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY notifications_user_update
  FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = user_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);