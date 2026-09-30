-- Account dashboard schema repair + order ownership.
-- This migration is intentionally idempotent because some production databases
-- predate the migrations that introduced these columns.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS product_id TEXT;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Backfill product_id for older order rows from the metadata payload where possible.
UPDATE orders
SET product_id = COALESCE(
  product_id,
  metadata->>'product_id',
  metadata->>'productId',
  metadata->>'product_code',
  'unknown'
)
WHERE product_id IS NULL;

ALTER TABLE orders
  ALTER COLUMN product_id SET NOT NULL;

-- Link historical orders to existing accounts by checkout email.
UPDATE orders AS o
SET user_id = u.id
FROM users AS u
WHERE o.user_id IS NULL
  AND o.customer_email IS NOT NULL
  AND lower(trim(o.customer_email)) = lower(trim(u.email));

UPDATE shop_orders AS o
SET user_id = u.id
FROM users AS u
WHERE o.user_id IS NULL
  AND o.customer_email IS NOT NULL
  AND lower(trim(o.customer_email)) = lower(trim(u.email));

CREATE INDEX IF NOT EXISTS idx_orders_user_id
  ON orders(user_id);

CREATE INDEX IF NOT EXISTS idx_shop_orders_user_id
  ON shop_orders(user_id);

ALTER TABLE shop_orders
  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own shop orders"
  ON shop_orders;

CREATE POLICY "Users can read own shop orders"
  ON shop_orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
