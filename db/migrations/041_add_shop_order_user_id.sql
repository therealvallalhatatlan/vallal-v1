ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

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
