-- 051_canonicalize_user_identity.sql
-- Canonicalize current users around auth.users.id without deleting historical
-- public.users profiles or paid orders.
--
-- Current production state this migration repairs:
--   * auth.users = canonical identity
--   * public.users = legacy + current profile store
--   * orders.user_id -> public.users.id (legacy FK)
--
-- Target state:
--   * auth.users = canonical identity
--   * public.users.id = auth.users.id for every current account
--   * orders.user_id -> auth.users.id
--   * historical public.users IDs retained in orders.legacy_public_user_id
--     and user_identity_aliases where applicable
--
-- This migration is intentionally transactional.

BEGIN;

DO $pg$
DECLARE
  v_nullable TEXT;
BEGIN
  SELECT is_nullable
  INTO v_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'orders'
    AND column_name = 'user_id';

  IF v_nullable IS NULL THEN
    RAISE EXCEPTION '051 aborted: public.orders.user_id column does not exist';
  END IF;
END;
$pg$;

-- Legacy orders may currently require a user_id because the old model used
-- public.users.id as the foreign key. The canonical model must allow NULL so
-- historical orders belonging to a person who no longer has an Auth account
-- can retain their legacy identity without inventing an Auth user.
ALTER TABLE public.orders
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS legacy_public_user_id UUID;

CREATE INDEX IF NOT EXISTS idx_orders_legacy_public_user_id
  ON public.orders(legacy_public_user_id);

-- Snapshot every public.users identity that is not already an exact Auth match.
CREATE TEMP TABLE _user_identity_051_map (
  legacy_public_user_id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  canonical_auth_user_id UUID NULL
) ON COMMIT DROP;

INSERT INTO _user_identity_051_map (
  legacy_public_user_id,
  email,
  canonical_auth_user_id
)
SELECT
  pu.id,
  pu.email,
  au.id
FROM public.users pu
LEFT JOIN auth.users au
  ON lower(trim(au.email)) = lower(trim(pu.email))
WHERE pu.id IS DISTINCT FROM au.id;

-- Safety checks:
-- 1) Every email-based legacy match must resolve to at most one Auth account.
DO $pg$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.users pu
    JOIN auth.users au
      ON lower(trim(au.email)) = lower(trim(pu.email))
    WHERE pu.id <> au.id
    GROUP BY lower(trim(pu.email))
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      '051 aborted: an email maps to multiple Auth users';
  END IF;
END;
$pg$;

-- 2) A canonical Auth UUID must not already belong to another public.users row.
DO $pg$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM _user_identity_051_map m
    JOIN public.users existing
      ON existing.id = m.canonical_auth_user_id
    WHERE m.canonical_auth_user_id IS NOT NULL
      AND existing.id <> m.legacy_public_user_id
  ) THEN
    RAISE EXCEPTION
      '051 aborted: canonical Auth UUID already exists in public.users';
  END IF;
END;
$pg$;

-- 3) Do not overwrite a previously confirmed alias that points elsewhere.
DO $pg$
BEGIN
  IF to_regclass('public.user_identity_aliases') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM _user_identity_051_map m
       JOIN public.user_identity_aliases a
         ON a.identity_type = 'legacy_user_id'
        AND a.normalized_value = m.legacy_public_user_id::text
        AND a.confidence = 'confirmed'
        AND a.user_id <> m.canonical_auth_user_id
      WHERE m.canonical_auth_user_id IS NOT NULL
    )
  THEN
    RAISE EXCEPTION
      '051 aborted: confirmed legacy_user_id alias points to a different Auth user';
  END IF;
END;
$pg$;

-- 4) Do not overwrite a previously confirmed email alias that points elsewhere.
DO $pg$
BEGIN
  IF to_regclass('public.user_identity_aliases') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM _user_identity_051_map m
       JOIN public.user_identity_aliases a
         ON a.identity_type = 'email'
        AND a.normalized_value = lower(trim(m.email))
        AND a.confidence = 'confirmed'
        AND a.user_id <> m.canonical_auth_user_id
      WHERE m.canonical_auth_user_id IS NOT NULL
    )
  THEN
    RAISE EXCEPTION
      '051 aborted: confirmed email alias points to a different Auth user';
  END IF;
END;
$pg$;

-- Preserve the old public.users ID on every affected historical order before
-- changing the ownership column.
UPDATE public.orders o
SET legacy_public_user_id = o.user_id
FROM _user_identity_051_map m
WHERE o.user_id = m.legacy_public_user_id
  AND o.legacy_public_user_id IS NULL;

-- The old production FK blocks the transition. Remove it temporarily.
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

-- 47 current accounts have a different legacy public.users ID.
-- Move their order ownership to the canonical Auth ID.
UPDATE public.orders o
SET user_id = m.canonical_auth_user_id
FROM _user_identity_051_map m
WHERE o.user_id = m.legacy_public_user_id
  AND m.canonical_auth_user_id IS NOT NULL;

-- Historical public.users profiles with no current Auth account cannot remain
-- in orders.user_id once that column points to auth.users. Keep the historical
-- identity in legacy_public_user_id and make canonical ownership NULL.
UPDATE public.orders o
SET user_id = NULL
FROM _user_identity_051_map m
WHERE o.user_id = m.legacy_public_user_id
  AND m.canonical_auth_user_id IS NULL;

-- Move book ownership for the 47 current accounts where book_copies.user_id
-- is still NULL but the historical order email identifies the same account.
UPDATE public.book_copies bc
SET user_id = m.canonical_auth_user_id,
    updated_at = now()
FROM _user_identity_051_map m
WHERE m.canonical_auth_user_id IS NOT NULL
  AND lower(trim(COALESCE(bc.order_email, ''))) = lower(trim(m.email))
  AND bc.user_id IS NULL;

-- For the 47 current accounts, reuse the existing public.users row and change
-- only its primary ID. No profile row is deleted.
UPDATE public.users pu
SET
  id = m.canonical_auth_user_id,
  email = m.email,
  updated_at = now()
FROM _user_identity_051_map m
WHERE pu.id = m.legacy_public_user_id
  AND m.canonical_auth_user_id IS NOT NULL;

-- Preserve the old identity explicitly for future reconciliation/audit.
INSERT INTO public.user_identity_aliases (
  user_id,
  identity_type,
  identity_value,
  normalized_value,
  source,
  confidence,
  note
)
SELECT
  m.canonical_auth_user_id,
  'legacy_user_id',
  m.legacy_public_user_id::text,
  m.legacy_public_user_id::text,
  'migration_051_canonicalize_user_identity',
  'confirmed',
  'Legacy public.users ID preserved while canonicalizing to auth.users.id'
FROM _user_identity_051_map m
WHERE m.canonical_auth_user_id IS NOT NULL
ON CONFLICT (user_id, identity_type, normalized_value)
DO UPDATE SET
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  note = EXCLUDED.note,
  updated_at = now();

INSERT INTO public.user_identity_aliases (
  user_id,
  identity_type,
  identity_value,
  normalized_value,
  source,
  confidence,
  note
)
SELECT
  m.canonical_auth_user_id,
  'email',
  m.email,
  lower(trim(m.email)),
  'migration_051_canonicalize_user_identity',
  'confirmed',
  'Historical public.users email mapped to canonical Auth user'
FROM _user_identity_051_map m
WHERE m.canonical_auth_user_id IS NOT NULL
ON CONFLICT (user_id, identity_type, normalized_value)
DO UPDATE SET
  source = EXCLUDED.source,
  confidence = EXCLUDED.confidence,
  note = EXCLUDED.note,
  updated_at = now();

-- The remaining non-null order ownership must now be valid Auth ownership.
DO $pg$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.orders o
    LEFT JOIN auth.users au
      ON au.id = o.user_id
    WHERE o.user_id IS NOT NULL
      AND au.id IS NULL
  ) THEN
    RAISE EXCEPTION
      '051 aborted: orders.user_id still contains a non-Auth UUID';
  END IF;
END;
$pg$;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

-- Replace the legacy reconciliation function so future Auth registrations can
-- reclaim the 56 historical public profiles whose orders were detached above.
CREATE OR REPLACE FUNCTION public.reconcile_legacy_user(
  p_legacy_user_id UUID,
  p_canonical_user_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $pg$
DECLARE
  v_legacy users%ROWTYPE;
  v_auth_email TEXT;
  v_canonical users%ROWTYPE;
  v_orders_moved INTEGER := 0;
  v_shop_orders_moved INTEGER := 0;
  v_book_copies_moved INTEGER := 0;
  v_alias_email TEXT;
BEGIN
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

  IF lower(trim(COALESCE(v_legacy.email, ''))) <> lower(trim(v_auth_email)) THEN
    RAISE EXCEPTION
      'legacy_email_does_not_match_canonical_auth_email:%:%',
      v_legacy.email,
      v_auth_email;
  END IF;

  SELECT *
  INTO v_canonical
  FROM public.users
  WHERE id = p_canonical_user_id
  FOR UPDATE;

  -- Orders may now be owned by Auth UUIDs only. Historical legacy orders from
  -- pre-051 live in legacy_public_user_id until the person authenticates.
  UPDATE public.orders
  SET
    user_id = p_canonical_user_id,
    legacy_public_user_id = COALESCE(
      legacy_public_user_id,
      p_legacy_user_id
    )
  WHERE user_id = p_legacy_user_id
     OR legacy_public_user_id = p_legacy_user_id;

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
    AND user_id IS NULL;

  GET DIAGNOSTICS v_book_copies_moved = ROW_COUNT;

  IF v_canonical IS NULL THEN
    -- Preserve the legacy profile row, including its historical created_at and
    -- nickname, while making its ID canonical.
    UPDATE public.users
    SET
      id = p_canonical_user_id,
      email = v_auth_email,
      updated_at = now()
    WHERE id = p_legacy_user_id
    RETURNING * INTO v_canonical;
  ELSE
    -- A canonical profile already exists. Merge legacy profile fields into it,
    -- then remove the duplicate legacy profile.
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

    DELETE FROM public.users
    WHERE id = p_legacy_user_id;
  END IF;

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
$pg$;

REVOKE ALL ON FUNCTION public.reconcile_legacy_user(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reconcile_legacy_user(uuid, uuid, text)
  TO service_role;

-- Keep Auth and public.users synchronized for every future registration.
-- When a newly-created Auth user has an existing legacy public profile with the
-- same email, reuse that profile row, migrate its historical orders, and retain
-- the old public.users ID as legacy_public_user_id.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $pg$
DECLARE
  v_profile users%ROWTYPE;
  v_legacy_user_id UUID;
  v_found_by_email BOOLEAN := false;
BEGIN
  -- First prefer the canonical public profile if it already exists.
  SELECT *
  INTO v_profile
  FROM public.users
  WHERE id = NEW.id
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.users
    SET
      email = COALESCE(NEW.email, email),
      updated_at = now()
    WHERE id = NEW.id;

    RETURN NEW;
  END IF;

  -- Otherwise reclaim an existing historical profile by email.
  IF NEW.email IS NOT NULL AND trim(NEW.email) <> '' THEN
    SELECT *
    INTO v_profile
    FROM public.users
    WHERE lower(trim(email)) = lower(trim(NEW.email))
    LIMIT 1
    FOR UPDATE;

    v_found_by_email := FOUND;
  END IF;

  IF v_found_by_email THEN
    v_legacy_user_id := v_profile.id;

    UPDATE public.orders
    SET
      user_id = NEW.id,
      legacy_public_user_id = COALESCE(
        legacy_public_user_id,
        v_legacy_user_id
      )
    WHERE user_id = v_legacy_user_id
       OR legacy_public_user_id = v_legacy_user_id;

    UPDATE public.book_copies
    SET
      user_id = NEW.id,
      updated_at = now()
    WHERE lower(trim(COALESCE(order_email, ''))) =
          lower(trim(NEW.email))
      AND user_id IS NULL;

    UPDATE public.users
    SET
      id = NEW.id,
      email = NEW.email,
      updated_at = now()
    WHERE id = v_legacy_user_id;

    IF NOT EXISTS (
      SELECT 1
      FROM public.user_identity_aliases a
      WHERE a.identity_type = 'legacy_user_id'
        AND a.normalized_value = v_legacy_user_id::text
        AND a.confidence = 'confirmed'
        AND a.user_id <> NEW.id
    ) THEN
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
        NEW.id,
        'legacy_user_id',
        v_legacy_user_id::text,
        v_legacy_user_id::text,
        'auth_user_trigger',
        'confirmed',
        'Legacy public.users profile reclaimed by matching Auth email'
      )
      ON CONFLICT (user_id, identity_type, normalized_value)
      DO UPDATE SET
        updated_at = now(),
        note = EXCLUDED.note;
    END IF;

    IF NEW.email IS NOT NULL
       AND NOT EXISTS (
         SELECT 1
         FROM public.user_identity_aliases a
         WHERE a.identity_type = 'email'
           AND a.normalized_value = lower(trim(NEW.email))
           AND a.confidence = 'confirmed'
           AND a.user_id <> NEW.id
       )
    THEN
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
        NEW.id,
        'email',
        NEW.email,
        lower(trim(NEW.email)),
        'auth_user_trigger',
        'confirmed',
        'Auth user matched to historical public.users email'
      )
      ON CONFLICT (user_id, identity_type, normalized_value)
      DO UPDATE SET
        updated_at = now(),
        note = EXCLUDED.note;
    END IF;

    INSERT INTO public.user_reconciliation_log (
      user_id,
      related_user_id,
      related_legacy_user_id,
      action,
      reason,
      metadata
    )
    VALUES (
      NEW.id,
      NULL,
      v_legacy_user_id,
      'merge_legacy_user',
      'Automatic Auth registration reconciliation',
      jsonb_build_object(
        'legacy_email', v_profile.email,
        'canonical_email', NEW.email
      )
    );

    RETURN NEW;
  END IF;

  -- No historical profile exists. Create the normal application profile.
  INSERT INTO public.users (
    id,
    email,
    nickname,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    NULL,
    COALESCE(NEW.created_at, now()),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = COALESCE(EXCLUDED.email, public.users.email),
    updated_at = now();

  RETURN NEW;
END;
$pg$;

REVOKE ALL ON FUNCTION public.handle_new_auth_user()
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.handle_new_auth_user()
  TO postgres, service_role;

DROP TRIGGER IF EXISTS on_auth_user_created_profile
  ON auth.users;

CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- Final sanity checks.
DO $pg$
DECLARE
  v_auth_users INTEGER;
  v_exact_matches INTEGER;
  v_email_mismatch INTEGER;
  v_invalid_order_users INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_auth_users
  FROM auth.users;

  SELECT COUNT(*) INTO v_exact_matches
  FROM auth.users au
  JOIN public.users pu ON pu.id = au.id;

  SELECT COUNT(*) INTO v_email_mismatch
  FROM public.users pu
  JOIN auth.users au
    ON lower(trim(pu.email)) = lower(trim(au.email))
  WHERE pu.id <> au.id;

  SELECT COUNT(*) INTO v_invalid_order_users
  FROM public.orders o
  LEFT JOIN auth.users au ON au.id = o.user_id
  WHERE o.user_id IS NOT NULL
    AND au.id IS NULL;

  IF v_exact_matches <> v_auth_users THEN
    RAISE EXCEPTION
      '051 validation failed: % Auth users but % exact public.users matches',
      v_auth_users,
      v_exact_matches;
  END IF;

  IF v_email_mismatch <> 0 THEN
    RAISE EXCEPTION
      '051 validation failed: % email-based legacy mismatches remain',
      v_email_mismatch;
  END IF;

  IF v_invalid_order_users <> 0 THEN
    RAISE EXCEPTION
      '051 validation failed: % orders still reference a non-Auth user',
      v_invalid_order_users;
  END IF;

  RAISE NOTICE
    '051 complete: % Auth users, % exact public.users matches, % legacy public profiles remain',
    v_auth_users,
    v_exact_matches,
    (SELECT COUNT(*)
     FROM public.users pu
     LEFT JOIN auth.users au ON au.id = pu.id
     WHERE au.id IS NULL);
END;
$pg$;

COMMIT;
