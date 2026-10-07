-- Egress optimization: consolidate background notification reads and denormalize public avatar metadata.
-- The RPCs below are intentionally restricted to service_role.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

UPDATE public.users AS u
SET avatar_url = COALESCE(
  au.raw_user_meta_data->>'avatar_url',
  au.raw_user_meta_data->>'picture'
)
FROM auth.users AS au
WHERE au.id = u.id
  AND u.avatar_url IS DISTINCT FROM COALESCE(
    au.raw_user_meta_data->>'avatar_url',
    au.raw_user_meta_data->>'picture'
  );

CREATE OR REPLACE FUNCTION public.sync_user_profile_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    )
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        avatar_url = EXCLUDED.avatar_url;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_user_profile_from_auth ON auth.users;

CREATE TRIGGER sync_user_profile_from_auth
AFTER INSERT OR UPDATE OF email, raw_user_meta_data
ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_profile_from_auth();

REVOKE ALL ON FUNCTION public.sync_user_profile_from_auth() FROM PUBLIC;

CREATE INDEX IF NOT EXISTS notifications_user_unread_created_idx
  ON public.notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_claims_user_status
  ON public.claims (user_id, status)
  WHERE status IN ('pending', 'accepted');

CREATE OR REPLACE FUNCTION public.get_notification_unread_snapshot(p_user_id UUID)
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH unread_notifications AS (
    SELECT
      id,
      title,
      body,
      data,
      created_at,
      COUNT(*) OVER () AS unread_count
    FROM public.notifications
    WHERE user_id = p_user_id
      AND read_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  )
  SELECT jsonb_build_object(
    'unreadNotificationCount',
      COALESCE((SELECT unread_count FROM unread_notifications), 0),
    'latestNotification',
      (SELECT jsonb_build_object(
        'id', id,
        'title', title,
        'body', body,
        'data', data,
        'created_at', created_at
      ) FROM unread_notifications),
    'unreadByUserId',
      COALESCE((
        SELECT jsonb_object_agg(other_user_id::text, unread_count)
        FROM public.pm_unread_counts
        WHERE user_id = p_user_id
          AND unread_count > 0
      ), '{}'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION public.get_notification_unread_snapshot(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_notification_unread_snapshot(UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.get_online_user_profiles(p_since TIMESTAMPTZ)
RETURNS TABLE (
  user_id UUID,
  nickname TEXT,
  avatar_url TEXT,
  score BIGINT,
  accepted BIGINT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  last_heartbeat TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    rp.user_id,
    COALESCE(NULLIF(u.nickname, ''), 'user-' || left(rp.user_id::text, 6)) AS nickname,
    u.avatar_url,
    COUNT(c.id) FILTER (WHERE c.status IN ('pending', 'accepted')) AS score,
    COUNT(c.id) FILTER (WHERE c.status = 'accepted') AS accepted,
    rp.lat,
    rp.lng,
    rp.last_heartbeat
  FROM public.reader_presence AS rp
  LEFT JOIN public.users AS u
    ON u.id = rp.user_id
  LEFT JOIN public.claims AS c
    ON c.user_id = rp.user_id
   AND c.status IN ('pending', 'accepted')
  WHERE rp.last_heartbeat >= p_since
  GROUP BY
    rp.user_id,
    u.nickname,
    u.avatar_url,
    rp.lat,
    rp.lng,
    rp.last_heartbeat
  ORDER BY rp.last_heartbeat DESC;
$$;

REVOKE ALL ON FUNCTION public.get_online_user_profiles(TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_online_user_profiles(TIMESTAMPTZ) TO service_role;