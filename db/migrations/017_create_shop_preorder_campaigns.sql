CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS preorder_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  goal INTEGER NOT NULL CHECK (goal > 0),
  current_count INTEGER NOT NULL DEFAULT 0 CHECK (current_count >= 0),
  status TEXT NOT NULL DEFAULT 'collecting' CHECK (status IN ('collecting', 'printing_started')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS preorder_campaign_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES preorder_campaigns(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, product_id)
);

CREATE TABLE IF NOT EXISTS shop_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_type TEXT NOT NULL DEFAULT 'merch' CHECK (order_type IN ('merch')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'canceled', 'payment_failed')),
  currency TEXT NOT NULL DEFAULT 'huf',
  subtotal_amount INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_amount >= 0),
  stripe_checkout_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  stripe_customer_id TEXT,
  customer_email TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS shop_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_type TEXT NOT NULL,
  product_name TEXT NOT NULL,
  variant_id TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_amount INTEGER NOT NULL CHECK (unit_amount >= 0),
  preorder_campaign_slug TEXT REFERENCES preorder_campaigns(slug) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  stripe_event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  stripe_object_id TEXT,
  order_id UUID REFERENCES shop_orders(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'processed', 'ignored', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_preorder_campaigns_active ON preorder_campaigns(is_active);
CREATE INDEX IF NOT EXISTS idx_preorder_campaign_products_product_id ON preorder_campaign_products(product_id);
CREATE INDEX IF NOT EXISTS idx_shop_orders_status ON shop_orders(status);
CREATE INDEX IF NOT EXISTS idx_shop_orders_created_at ON shop_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shop_order_items_order_id ON shop_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_shop_order_items_campaign_slug ON shop_order_items(preorder_campaign_slug);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_order_id ON stripe_webhook_events(order_id);

ALTER TABLE preorder_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE preorder_campaign_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read preorder campaigns"
  ON preorder_campaigns
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read preorder campaign products"
  ON preorder_campaign_products
  FOR SELECT
  USING (true);

CREATE OR REPLACE FUNCTION apply_shop_order_payment(
  p_order_id UUID,
  p_stripe_event_id TEXT,
  p_event_type TEXT,
  p_stripe_object_id TEXT,
  p_stripe_session_id TEXT,
  p_customer_email TEXT,
  p_payment_intent_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order shop_orders%ROWTYPE;
  v_campaigns_updated INTEGER := 0;
  v_existing_event_status TEXT;
BEGIN
  SELECT status
  INTO v_existing_event_status
  FROM stripe_webhook_events
  WHERE stripe_event_id = p_stripe_event_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing_event_status = 'failed' THEN
      UPDATE stripe_webhook_events
      SET status = 'processing',
          event_type = p_event_type,
          stripe_object_id = p_stripe_object_id,
          order_id = p_order_id,
          error_message = NULL,
          processed_at = NULL
      WHERE stripe_event_id = p_stripe_event_id;
    ELSE
      RETURN jsonb_build_object(
        'applied', false,
        'reason', 'duplicate_event',
        'campaignsUpdated', 0
      );
    END IF;
  ELSE
    INSERT INTO stripe_webhook_events (
      stripe_event_id,
      event_type,
      stripe_object_id,
      order_id,
      status
    )
    VALUES (
      p_stripe_event_id,
      p_event_type,
      p_stripe_object_id,
      p_order_id,
      'processing'
    );
  END IF;

  SELECT *
  INTO v_order
  FROM shop_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    UPDATE stripe_webhook_events
    SET status = 'ignored',
        error_message = 'order_not_found',
        processed_at = now()
    WHERE stripe_event_id = p_stripe_event_id;

    RETURN jsonb_build_object(
      'applied', false,
      'reason', 'order_not_found',
      'campaignsUpdated', 0
    );
  END IF;

  IF v_order.status = 'paid' THEN
    UPDATE stripe_webhook_events
    SET status = 'ignored',
        error_message = 'order_already_paid',
        processed_at = now()
    WHERE stripe_event_id = p_stripe_event_id;

    RETURN jsonb_build_object(
      'applied', false,
      'reason', 'order_already_paid',
      'campaignsUpdated', 0
    );
  END IF;

  UPDATE shop_orders
  SET status = 'paid',
      stripe_checkout_session_id = COALESCE(p_stripe_session_id, stripe_checkout_session_id),
      stripe_payment_intent_id = COALESCE(p_payment_intent_id, stripe_payment_intent_id),
      customer_email = COALESCE(p_customer_email, customer_email),
      paid_at = COALESCE(paid_at, now()),
      updated_at = now()
  WHERE id = p_order_id;

  WITH campaign_totals AS (
    SELECT preorder_campaign_slug AS slug, SUM(quantity)::INTEGER AS total_quantity
    FROM shop_order_items
    WHERE order_id = p_order_id
      AND preorder_campaign_slug IS NOT NULL
    GROUP BY preorder_campaign_slug
  ),
  updated_campaigns AS (
    UPDATE preorder_campaigns AS campaign
    SET current_count = campaign.current_count + campaign_totals.total_quantity,
        status = CASE
          WHEN campaign.current_count + campaign_totals.total_quantity >= campaign.goal THEN 'printing_started'
          ELSE 'collecting'
        END,
        updated_at = now()
    FROM campaign_totals
    WHERE campaign.slug = campaign_totals.slug
    RETURNING campaign.id
  )
  SELECT COUNT(*)::INTEGER
  INTO v_campaigns_updated
  FROM updated_campaigns;

  UPDATE stripe_webhook_events
  SET status = 'processed',
      processed_at = now(),
      error_message = NULL
  WHERE stripe_event_id = p_stripe_event_id;

  RETURN jsonb_build_object(
    'applied', true,
    'reason', 'processed',
    'campaignsUpdated', v_campaigns_updated
  );
EXCEPTION
  WHEN OTHERS THEN
    UPDATE stripe_webhook_events
    SET status = 'failed',
        error_message = SQLERRM,
        processed_at = now()
    WHERE stripe_event_id = p_stripe_event_id;

    RAISE;
END;
$$;

INSERT INTO preorder_campaigns (
  slug,
  name,
  description,
  goal,
  current_count,
  status,
  is_active
)
VALUES (
  'tshirt-drop',
  'Vállalhatatlan T-Shirt Drop',
  'Shared preorder campaign for the men and women shirts.',
  20,
  0,
  'collecting',
  true
)
ON CONFLICT (slug) DO UPDATE
SET goal = EXCLUDED.goal,
    description = EXCLUDED.description,
    is_active = true,
    updated_at = now();

INSERT INTO preorder_campaign_products (campaign_id, product_id)
SELECT id, 'men-shirt-1'
FROM preorder_campaigns
WHERE slug = 'tshirt-drop'
ON CONFLICT (campaign_id, product_id) DO NOTHING;

INSERT INTO preorder_campaign_products (campaign_id, product_id)
SELECT id, 'women-shirt-1'
FROM preorder_campaigns
WHERE slug = 'tshirt-drop'
ON CONFLICT (campaign_id, product_id) DO NOTHING;