ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS anonymized_user_hash TEXT,
  ADD COLUMN IF NOT EXISTS delivery_type TEXT,
  ADD COLUMN IF NOT EXISTS telegram_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS telegram_send_error TEXT,
  ADD COLUMN IF NOT EXISTS telegram_send_attempts INTEGER NOT NULL DEFAULT 0;

UPDATE orders
SET delivery_type = COALESCE(delivery_type, 'dead_drop')
WHERE delivery_type IS NULL;

ALTER TABLE orders
  ALTER COLUMN delivery_type SET DEFAULT 'dead_drop';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_delivery_type_check'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_delivery_type_check
      CHECK (delivery_type IN ('dead_drop', 'anonymous_locker'));
  END IF;
END $$;

ALTER TABLE orders
  ALTER COLUMN delivery_type SET NOT NULL;

ALTER TABLE orders
  DROP COLUMN IF EXISTS telegram_user_id;

CREATE INDEX IF NOT EXISTS idx_orders_anonymized_user_hash ON orders(anonymized_user_hash);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_type ON orders(delivery_type);
