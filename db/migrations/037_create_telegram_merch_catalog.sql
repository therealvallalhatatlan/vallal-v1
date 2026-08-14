CREATE TABLE IF NOT EXISTS telegram_merch_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  product_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  price_huf INTEGER NOT NULL CHECK (price_huf > 0),
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 1000,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_telegram_merch_catalog_active_sort
  ON telegram_merch_catalog(active, sort_order, created_at DESC);

ALTER TABLE telegram_merch_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "telegram_merch_catalog_service_role_all"
  ON telegram_merch_catalog
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
