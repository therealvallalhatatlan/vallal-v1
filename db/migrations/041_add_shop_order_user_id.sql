-- Account dashboard schema repair + order ownership.
-- Idempotent and safe against older production schemas.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS product_id TEXT,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispatch_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS customer_email TEXT;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Recover email/product identifiers from metadata when an older order row has them
-- only inside metadata rather than as first-class columns.
UPDATE orders
SET
  customer_email = COALESCE(
    customer_email,
    metadata->>'customer_email',
    metadata->>'email'
  ),
  product_id = COALESCE(
    product_id,
    metadata->>'product_id',
    metadata->>'productId',
    metadata->>'product_code',
    'unknown'
  )
WHERE
  customer_email IS NULL
  OR product_id IS NULL;

-- Connect historical orders to known accounts by normalized email.
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
