-- Migration: 014_create_push_subscriptions
-- Web Push subscriptions for V. proactive notifications

CREATE TABLE IF NOT EXISTS user_push_subscriptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text NOT NULL,
  endpoint        text NOT NULL UNIQUE,
  p256dh          text NOT NULL,
  auth            text NOT NULL,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_push_subscriptions_user_id_idx
  ON user_push_subscriptions (user_id);

CREATE INDEX IF NOT EXISTS user_push_subscriptions_active_idx
  ON user_push_subscriptions (user_id, active)
  WHERE active = true;

-- RLS
ALTER TABLE user_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY "user_push_subscriptions_select_own"
  ON user_push_subscriptions FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "user_push_subscriptions_insert_own"
  ON user_push_subscriptions FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "user_push_subscriptions_update_own"
  ON user_push_subscriptions FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "user_push_subscriptions_delete_own"
  ON user_push_subscriptions FOR DELETE
  USING (auth.uid()::text = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_push_subscription_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER push_subscriptions_updated_at
  BEFORE UPDATE ON user_push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_push_subscription_updated_at();
