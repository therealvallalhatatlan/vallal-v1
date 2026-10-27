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
