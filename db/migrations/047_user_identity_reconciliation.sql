-- Canonical user identity / reconciliation layer.
-- This migration is intentionally additive: it does not rewrite or delete legacy data.

CREATE TABLE IF NOT EXISTS user_identity_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  identity_type TEXT NOT NULL CHECK (
    identity_type IN ('email', 'legacy_user_id', 'stripe_customer_id', 'telegram_user_id')
  ),
  identity_value TEXT NOT NULL,
  normalized_value TEXT NOT NULL,
  source TEXT,
  confidence TEXT NOT NULL DEFAULT 'confirmed' CHECK (
    confidence IN ('confirmed', 'probable', 'ambiguous', 'legacy')
  ),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, identity_type, normalized_value)
);

CREATE INDEX IF NOT EXISTS idx_user_identity_aliases_user_id
  ON user_identity_aliases(user_id);

CREATE INDEX IF NOT EXISTS idx_user_identity_aliases_lookup
  ON user_identity_aliases(identity_type, normalized_value);

ALTER TABLE user_identity_aliases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_identity_aliases_service_role_all ON user_identity_aliases;
CREATE POLICY user_identity_aliases_service_role_all
  ON user_identity_aliases
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS user_reconciliation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  related_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_reconciliation_log_user_id
  ON user_reconciliation_log(user_id);

ALTER TABLE user_reconciliation_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_reconciliation_log_service_role_all ON user_reconciliation_log;
CREATE POLICY user_reconciliation_log_service_role_all
  ON user_reconciliation_log
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Book ownership becomes structurally attachable to a canonical user/order.
-- Existing order_email remains as a historical snapshot for legacy records.
ALTER TABLE book_copies
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_book_copies_user_id
  ON book_copies(user_id);

CREATE INDEX IF NOT EXISTS idx_book_copies_order_id
  ON book_copies(order_id);
