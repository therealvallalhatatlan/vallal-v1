-- Public system broadcasts are opt-in.
-- Guest visitors must never see private/user-targeted notifications.
-- The existing broadcast RPC can mark a broadcast public by passing
-- {"public": true} inside p_data. The public API exposes only title/body/id/time.

ALTER TABLE public.notification_broadcasts
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS notification_broadcasts_public_created_idx
  ON public.notification_broadcasts (created_at DESC)
  WHERE is_public = true;

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
  v_data jsonb := COALESCE(p_data, '{}'::jsonb);
  v_is_public boolean := COALESCE((v_data ->> 'public')::boolean, false);
BEGIN
  INSERT INTO public.notification_broadcasts (
    type,
    title,
    body,
    data,
    is_public,
    created_by
  )
  VALUES (
    'system',
    trim(p_title),
    NULLIF(trim(p_body), ''),
    v_data,
    v_is_public,
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
    v_data || jsonb_build_object(
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
