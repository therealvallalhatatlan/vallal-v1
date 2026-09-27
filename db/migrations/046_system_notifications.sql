-- System notifications: welcome message + admin broadcasts.
-- Reuse the existing notifications inbox/unread system.

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('network', 'message', 'system'));

CREATE TABLE IF NOT EXISTS public.notification_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'system' CHECK (type = 'system'),
  title text NOT NULL,
  body text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  recipient_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notification_broadcasts_created_idx
  ON public.notification_broadcasts (created_at DESC);

ALTER TABLE public.notification_broadcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_broadcasts_service_role_all
  ON public.notification_broadcasts;

CREATE POLICY notification_broadcasts_service_role_all
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (true);

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS broadcast_id uuid
  REFERENCES public.notification_broadcasts (id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS notifications_broadcast_id_idx
  ON public.notifications (broadcast_id);

CREATE UNIQUE INDEX IF NOT EXISTS notifications_welcome_once_idx
  ON public.notifications (user_id)
  WHERE type = 'system'
    AND data ->> 'kind' = 'welcome_v1';

CREATE OR REPLACE FUNCTION public.notify_new_user_welcome()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    body,
    data
  )
  VALUES (
    NEW.id,
    'system',
    'Üdv a Hálózatban',
    'Mostantól te is benne vagy. Nézz körül. A többit majd megtalálod.',
    jsonb_build_object('kind', 'welcome_v1')
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auth_user_welcome_notification
  ON auth.users;

CREATE TRIGGER auth_user_welcome_notification
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_user_welcome();

-- Backfill the one-time welcome message for existing users.
INSERT INTO public.notifications (
  user_id,
  type,
  title,
  body,
  data
)
SELECT
  u.id,
  'system',
  'Üdv a Hálózatban',
  'Mostantól te is benne vagy. Nézz körül. A többit majd megtalálod.',
  jsonb_build_object('kind', 'welcome_v1')
FROM auth.users AS u
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications AS n
  WHERE n.user_id = u.id
    AND n.type = 'system'
    AND n.data ->> 'kind' = 'welcome_v1'
);

CREATE OR REPLACE FUNCTION public.send_system_notification_broadcast(
  p_title text,
  p_body text,
  p_data jsonb DEFAULT '{}'::jsonb,
  p_created_by uuid DEFAULT NULL
)
RETURNS TABLE (
  broadcast_id uuid,
  recipient_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_broadcast_id uuid;
  v_recipient_count integer;
BEGIN
  INSERT INTO public.notification_broadcasts (
    type,
    title,
    body,
    data,
    created_by
  )
  VALUES (
    'system',
    trim(p_title),
    NULLIF(trim(p_body), ''),
    COALESCE(p_data, '{}'::jsonb),
    p_created_by
  )
  RETURNING id INTO v_broadcast_id;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    body,
    data,
    broadcast_id
  )
  SELECT
    u.id,
    'system',
    trim(p_title),
    NULLIF(trim(p_body), ''),
    COALESCE(p_data, '{}'::jsonb) || jsonb_build_object(
      'kind', 'broadcast',
      'broadcast_id', v_broadcast_id
    ),
    v_broadcast_id
  FROM auth.users AS u;

  GET DIAGNOSTICS v_recipient_count = ROW_COUNT;

  UPDATE public.notification_broadcasts
  SET recipient_count = v_recipient_count
  WHERE id = v_broadcast_id;

  RETURN QUERY
  SELECT v_broadcast_id, v_recipient_count;
END;
$$;

REVOKE ALL ON FUNCTION public.send_system_notification_broadcast(text, text, jsonb, uuid)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.send_system_notification_broadcast(text, text, jsonb, uuid)
  TO service_role;
