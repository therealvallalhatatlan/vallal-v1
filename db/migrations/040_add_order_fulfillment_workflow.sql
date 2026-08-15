ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT,
  ADD COLUMN IF NOT EXISTS delivery_note TEXT,
  ADD COLUMN IF NOT EXISTS dispatch_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS dispatch_coordinates JSONB,
  ADD COLUMN IF NOT EXISTS dispatch_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fulfilled_by TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'metadata'
  ) THEN
    EXECUTE $sql$
      UPDATE orders
      SET telegram_chat_id = COALESCE(
        telegram_chat_id,
        metadata->>'telegram_chat_id',
        metadata->>'chat_id'
      )
      WHERE telegram_chat_id IS NULL
    $sql$;
  END IF;
END $$;

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending',
    'paid',
    'ready_to_dispatch',
    'dispatched',
    'fulfilled',
    'cancelled'
  ));

CREATE INDEX IF NOT EXISTS idx_orders_telegram_chat_id ON orders(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_orders_dispatch_sent_at ON orders(dispatch_sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_fulfilled_at ON orders(fulfilled_at DESC);

CREATE TABLE IF NOT EXISTS order_fulfillment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_email TEXT,
  payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_order_fulfillment_events_order_id
  ON order_fulfillment_events(order_id, created_at DESC);

ALTER TABLE order_fulfillment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS order_fulfillment_events_service_role_all ON order_fulfillment_events;

CREATE POLICY order_fulfillment_events_service_role_all
  ON order_fulfillment_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
