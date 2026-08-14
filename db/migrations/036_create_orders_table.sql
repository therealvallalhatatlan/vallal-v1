CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  stripe_session_id TEXT NOT NULL UNIQUE,
  anonymized_user_hash TEXT,
  product_id TEXT NOT NULL,
  delivery_type TEXT NOT NULL DEFAULT 'dead_drop' CHECK (delivery_type IN ('dead_drop', 'anonymous_locker')),
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'huf',
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'fulfilled', 'cancelled')),
  customer_email TEXT,
  customer_name TEXT,
  shipping_address JSONB,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_anonymized_user_hash ON orders(anonymized_user_hash);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_type ON orders(delivery_type);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orders_service_role_all ON orders;

CREATE POLICY orders_service_role_all
  ON orders
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');