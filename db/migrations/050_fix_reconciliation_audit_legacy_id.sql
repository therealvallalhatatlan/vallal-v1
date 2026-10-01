-- Fix reconciliation audit logging for legacy public.users IDs.
-- related_user_id points to auth.users, so a legacy public.users UUID cannot
-- safely be stored there. Preserve the legacy UUID in a dedicated column.

ALTER TABLE public.user_reconciliation_log
  ADD COLUMN IF NOT EXISTS related_legacy_user_id UUID;

CREATE OR REPLACE FUNCTION public.reconcile_legacy_user(
  p_legacy_user_id UUID,
  p_canonical_user_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_legacy users%ROWTYPE;
  v_auth_email TEXT;
  v_canonical users%ROWTYPE;
  v_orders_moved INTEGER := 0;
  v_shop_orders_moved INTEGER := 0;
  v_book_copies_moved INTEGER := 0;
  v_alias_email TEXT;
BEGIN
  -- Runtime calls use service_role. Supabase SQL Editor maintenance runs as
  -- postgres, which is also explicitly allowed for controlled manual repair.
  IF auth.role() <> 'service_role' AND current_user <> 'postgres' THEN
    RAISE EXCEPTION 'service_role_or_postgres_required';
  END IF;

  IF p_legacy_user_id IS NULL OR p_canonical_user_id IS NULL THEN
    RAISE EXCEPTION 'legacy_and_canonical_user_ids_required';
  END IF;

  IF p_legacy_user_id = p_canonical_user_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'same_user_id');
  END IF;

  SELECT *
  INTO v_legacy
  FROM public.users
  WHERE id = p_legacy_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'legacy_profile_not_found:%', p_legacy_user_id;
  END IF;

  SELECT email
  INTO v_auth_email
  FROM auth.users
  WHERE id = p_canonical_user_id;

  IF v_auth_email IS NULL THEN
    RAISE EXCEPTION 'canonical_auth_user_not_found:%', p_canonical_user_id;
  END IF;

  SELECT *
  INTO v_canonical
  FROM public.users
  WHERE id = p_canonical_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.users (
      id,
      email,
      nickname,
      created_at,
      updated_at
    )
    VALUES (
      p_canonical_user_id,
      v_auth_email,
      NULLIF(trim(v_legacy.nickname), ''),
      COALESCE(v_legacy.created_at, now()),
      now()
    )
    RETURNING * INTO v_canonical;
  ELSE
    UPDATE public.users
    SET
      email = COALESCE(NULLIF(trim(v_canonical.email), ''), v_auth_email),
      nickname = COALESCE(
        NULLIF(trim(v_canonical.nickname), ''),
        NULLIF(trim(v_legacy.nickname), '')
      ),
      updated_at = now()
    WHERE id = p_canonical_user_id
    RETURNING * INTO v_canonical;
  END IF;

  UPDATE public.orders
  SET user_id = p_canonical_user_id
  WHERE user_id = p_legacy_user_id;

  GET DIAGNOSTICS v_orders_moved = ROW_COUNT;

  UPDATE public.shop_orders
  SET user_id = p_canonical_user_id
  WHERE user_id = p_legacy_user_id;

  GET DIAGNOSTICS v_shop_orders_moved = ROW_COUNT;

  UPDATE public.book_copies
  SET
    user_id = p_canonical_user_id,
    updated_at = now()
  WHERE lower(trim(COALESCE(order_email, ''))) =
        lower(trim(COALESCE(v_legacy.email, '')))
    AND (user_id IS NULL OR user_id = p_legacy_user_id);

  GET DIAGNOSTICS v_book_copies_moved = ROW_COUNT;

  v_alias_email := NULLIF(lower(trim(v_legacy.email)), '');

  IF v_alias_email IS NOT NULL THEN
    INSERT INTO public.user_identity_aliases (
      user_id,
      identity_type,
      identity_value,
      normalized_value,
      source,
      confidence,
      note
    )
    VALUES (
      p_canonical_user_id,
      'email',
      v_legacy.email,
      v_alias_email,
      'legacy_reconciliation',
      'confirmed',
      p_note
    )
    ON CONFLICT (user_id, identity_type, normalized_value)
    DO UPDATE SET
      note = COALESCE(EXCLUDED.note, user_identity_aliases.note),
      updated_at = now();
  END IF;

  INSERT INTO public.user_identity_aliases (
    user_id,
    identity_type,
    identity_value,
    normalized_value,
    source,
    confidence,
    note
  )
  VALUES (
    p_canonical_user_id,
    'legacy_user_id',
    p_legacy_user_id::text,
    p_legacy_user_id::text,
    'legacy_reconciliation',
    'confirmed',
    p_note
  )
  ON CONFLICT (user_id, identity_type, normalized_value)
  DO UPDATE SET
    note = COALESCE(EXCLUDED.note, user_identity_aliases.note),
    updated_at = now();

  INSERT INTO public.user_reconciliation_log (
    user_id,
    related_user_id,
    related_legacy_user_id,
    action,
    reason,
    metadata
  )
  VALUES (
    p_canonical_user_id,
    NULL,
    p_legacy_user_id,
    'merge_legacy_user',
    COALESCE(
      p_note,
      'Legacy profile reconciled to canonical Auth user'
    ),
    jsonb_build_object(
      'legacy_email', v_legacy.email,
      'canonical_email', v_auth_email,
      'orders_moved', v_orders_moved,
      'shop_orders_moved', v_shop_orders_moved,
      'book_copies_moved', v_book_copies_moved
    )
  );

  DELETE FROM public.users
  WHERE id = p_legacy_user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'legacy_user_id', p_legacy_user_id,
    'canonical_user_id', p_canonical_user_id,
    'legacy_email', v_legacy.email,
    'canonical_email', v_auth_email,
    'orders_moved', v_orders_moved,
    'shop_orders_moved', v_shop_orders_moved,
    'book_copies_moved', v_book_copies_moved
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_legacy_user(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reconcile_legacy_user(uuid, uuid, text)
  TO service_role;
