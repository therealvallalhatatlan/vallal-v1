-- Account dashboard schema repair + order ownership.
-- Idempotent and safe against the legacy production schema.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS product_id TEXT,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispatch_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS customer_name TEXT;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Sync missing public profiles from Auth, but never create a duplicate email
-- because legacy production users.email is UNIQUE.
INSERT INTO users (id, email, created_at, updated_at)
SELECT
  au.id,
  au.email,
  COALESCE(au.created_at, now()),
  now()
FROM auth.users AS au
WHERE au.email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM users AS existing
    WHERE existing.id = au.id
       OR lower(trim(existing.email)) = lower(trim(au.email))
  )
ON CONFLICT (id) DO NOTHING;

-- Recover identifiers from metadata for legacy order rows.
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

-- Link historical orders directly against auth.users.
-- This guarantees that user_id satisfies the FK to auth.users even when
-- a legacy public.users row has a conflicting email or stale ID.
UPDATE orders AS o
SET user_id = au.id
FROM auth.users AS au
WHERE o.user_id IS NULL
  AND o.customer_email IS NOT NULL
  AND lower(trim(o.customer_email)) = lower(trim(au.email));

UPDATE shop_orders AS o
SET user_id = au.id
FROM auth.users AS au
WHERE o.user_id IS NULL
  AND o.customer_email IS NOT NULL
  AND lower(trim(o.customer_email)) = lower(trim(au.email));

CREATE INDEX IF NOT EXISTS idx_orders_user_id
  ON orders(user_id);

CREATE INDEX IF NOT EXISTS idx_shop_orders_user_id
  ON shop_orders(user_id);

ALTER TABLE shop_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own shop orders"
  ON shop_orders;

CREATE POLICY "Users can read own shop orders"
  ON shop_orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
