-- Order-specific, private communication threads for both order models.
-- This migration is intentionally additive and is not applied to production here.

CREATE TABLE IF NOT EXISTS public.order_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orders_order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  shop_order_id UUID REFERENCES public.shop_orders(id) ON DELETE CASCADE,
  customer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ,
  customer_last_read_at TIMESTAMPTZ,
  admin_last_read_at TIMESTAMPTZ,
  CONSTRAINT order_conversations_exactly_one_order
    CHECK (num_nonnulls(orders_order_id, shop_order_id) = 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS order_conversations_orders_order_id_uidx
  ON public.order_conversations(orders_order_id)
  WHERE orders_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS order_conversations_shop_order_id_uidx
  ON public.order_conversations(shop_order_id)
  WHERE shop_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS order_conversations_customer_user_id_idx
  ON public.order_conversations(customer_user_id);

CREATE INDEX IF NOT EXISTS order_conversations_last_message_at_idx
  ON public.order_conversations(last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.order_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.order_conversations(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('customer', 'admin')),
  sender_email TEXT,
  body TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_messages_conversation_created_idx
  ON public.order_messages(conversation_id, created_at ASC);

ALTER TABLE public.order_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.order_conversations FROM anon, authenticated;
REVOKE ALL ON public.order_messages FROM anon, authenticated;
GRANT ALL ON public.order_conversations TO service_role;
GRANT ALL ON public.order_messages TO service_role;

DROP POLICY IF EXISTS order_conversations_service_role_all ON public.order_conversations;
CREATE POLICY order_conversations_service_role_all
  ON public.order_conversations
  FOR ALL
  TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS order_messages_service_role_all ON public.order_messages;
CREATE POLICY order_messages_service_role_all
  ON public.order_messages
  FOR ALL
  TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Structured fulfillment state is separate from Stripe payment status.
-- Linked shop and operational orders may share one fulfillment record.
CREATE TABLE IF NOT EXISTS public.order_fulfillment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orders_order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  shop_order_id UUID REFERENCES public.shop_orders(id) ON DELETE CASCADE,
  delivery_method TEXT NOT NULL DEFAULT 'unknown'
    CHECK (delivery_method IN ('dead-drop', 'postaautomata', 'eu', 'personal', 'unknown')),
  fulfillment_status TEXT NOT NULL DEFAULT 'awaiting_contact'
    CHECK (fulfillment_status IN (
      'awaiting_contact',
      'pickup_date_proposed',
      'pickup_date_confirmed',
      'preparing',
      'location_released',
      'shipped',
      'received',
      'cancelled'
    )),
  proposed_pickup_at TIMESTAMPTZ,
  confirmed_pickup_at TIMESTAMPTZ,
  pickup_point TEXT,
  pickup_instructions TEXT,
  pickup_photo_url TEXT,
  pickup_lat DOUBLE PRECISION CHECK (pickup_lat IS NULL OR pickup_lat BETWEEN -90 AND 90),
  pickup_lng DOUBLE PRECISION CHECK (pickup_lng IS NULL OR pickup_lng BETWEEN -180 AND 180),
  location_released_at TIMESTAMPTZ,
  carrier TEXT,
  tracking_number TEXT,
  tracking_url TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  updated_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT order_fulfillment_has_order
    CHECK (orders_order_id IS NOT NULL OR shop_order_id IS NOT NULL),
  CONSTRAINT order_fulfillment_coordinates_pair
    CHECK (
      (pickup_lat IS NULL AND pickup_lng IS NULL)
      OR (pickup_lat IS NOT NULL AND pickup_lng IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS order_fulfillment_orders_order_id_uidx
  ON public.order_fulfillment(orders_order_id)
  WHERE orders_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS order_fulfillment_shop_order_id_uidx
  ON public.order_fulfillment(shop_order_id)
  WHERE shop_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS order_fulfillment_status_updated_idx
  ON public.order_fulfillment(fulfillment_status, updated_at DESC);

ALTER TABLE public.order_fulfillment ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_fulfillment FROM anon, authenticated;
GRANT ALL ON public.order_fulfillment TO service_role;

DROP POLICY IF EXISTS order_fulfillment_service_role_all ON public.order_fulfillment;
CREATE POLICY order_fulfillment_service_role_all
  ON public.order_fulfillment
  FOR ALL
  TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
