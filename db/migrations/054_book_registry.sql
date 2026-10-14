-- Vállalhatatlan book registry: additive schema, separate from legacy book_copies.
-- Apply manually only after reviewing this migration in the pull request.

CREATE TABLE IF NOT EXISTS public.book_editions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE CHECK (code ~ '^book_[a-z0-9_]+$'),
  title TEXT NOT NULL,
  serial_prefix TEXT NOT NULL CHECK (serial_prefix ~ '^[IVXLCDM]+$'),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.book_registry_copies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  edition_id UUID NOT NULL REFERENCES public.book_editions(id) ON DELETE RESTRICT,
  serial_number INTEGER NOT NULL CHECK (serial_number > 0),
  printed_copy_number TEXT,
  status TEXT NOT NULL DEFAULT 'awaiting_claim'
    CHECK (status IN ('awaiting_claim', 'registered', 'retired')),
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  location_lat NUMERIC(5, 2),
  location_lng NUMERIC(6, 2),
  map_visible BOOLEAN NOT NULL DEFAULT FALSE,
  registered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (edition_id, serial_number),
  CHECK (
    (location_lat IS NULL AND location_lng IS NULL)
    OR (location_lat IS NOT NULL AND location_lng IS NOT NULL)
  ),
  CHECK (map_visible = FALSE OR (location_lat IS NOT NULL AND location_lng IS NOT NULL)),
  CHECK (location_lat IS NULL OR location_lat BETWEEN -90 AND 90),
  CHECK (location_lng IS NULL OR location_lng BETWEEN -180 AND 180)
);

CREATE INDEX IF NOT EXISTS idx_book_registry_copies_owner
  ON public.book_registry_copies(owner_user_id)
  WHERE owner_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_book_registry_copies_public_map
  ON public.book_registry_copies(edition_id, serial_number)
  WHERE status = 'registered' AND map_visible = TRUE;

CREATE TABLE IF NOT EXISTS public.book_registry_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id UUID NOT NULL REFERENCES public.book_editions(id) ON DELETE RESTRICT,
  token_hash TEXT NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  source_type TEXT NOT NULL CHECK (
    source_type IN ('historical', 'purchase', 'distributor', 'admin')
  ),
  assigned_serial INTEGER,
  source_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'redeemed', 'revoked')),
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ,
  redeemed_copy_id UUID REFERENCES public.book_registry_copies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (source_type = 'historical' AND assigned_serial IS NOT NULL)
    OR (source_type <> 'historical' AND assigned_serial IS NULL)
  ),
  CHECK (assigned_serial IS NULL OR assigned_serial > 0),
  CHECK (
    (status = 'redeemed' AND redeemed_by IS NOT NULL AND redeemed_at IS NOT NULL AND redeemed_copy_id IS NOT NULL)
    OR status <> 'redeemed'
  ),
  FOREIGN KEY (edition_id, assigned_serial)
    REFERENCES public.book_registry_copies(edition_id, serial_number)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_book_registry_entitlements_edition_status
  ON public.book_registry_entitlements(edition_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_book_registry_active_historical_slot
  ON public.book_registry_entitlements(edition_id, assigned_serial)
  WHERE assigned_serial IS NOT NULL AND status <> 'revoked';

CREATE TABLE IF NOT EXISTS public.book_copy_ownership_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copy_id UUID NOT NULL REFERENCES public.book_registry_copies(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL CHECK (
    event_type IN ('claimed', 'transfer_started', 'transferred', 'location_changed', 'retired')
  ),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  previous_owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  new_owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_book_copy_ownership_events_copy
  ON public.book_copy_ownership_events(copy_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.book_copy_transfer_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copy_id UUID NOT NULL REFERENCES public.book_registry_copies(id) ON DELETE RESTRICT,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (accepted_at IS NULL OR revoked_at IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_book_copy_transfer_tokens_active
  ON public.book_copy_transfer_tokens(copy_id, expires_at)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

-- The digital identity and edition serial never change after a copy exists.
CREATE OR REPLACE FUNCTION public.prevent_book_registry_identity_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.public_id IS DISTINCT FROM OLD.public_id
     OR NEW.edition_id IS DISTINCT FROM OLD.edition_id
     OR NEW.serial_number IS DISTINCT FROM OLD.serial_number
  THEN
    RAISE EXCEPTION 'book_registry_identity_is_immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_book_registry_identity_immutable
  ON public.book_registry_copies;
CREATE TRIGGER trg_book_registry_identity_immutable
  BEFORE UPDATE ON public.book_registry_copies
  FOR EACH ROW EXECUTE FUNCTION public.prevent_book_registry_identity_change();

-- Seed the known editions. Historical serial slots are reserved even before
-- their owners claim them, so new claims begin at I-101 and II-081.
INSERT INTO public.book_editions (code, title, serial_prefix)
VALUES
  ('book_1', 'Vállalhatatlan I.', 'I'),
  ('book_2', 'Vállalhatatlan II.', 'II')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.book_registry_copies (edition_id, serial_number, status)
SELECT e.id, gs.serial_number, 'awaiting_claim'
FROM public.book_editions e
CROSS JOIN LATERAL generate_series(
  1,
  CASE e.code WHEN 'book_1' THEN 100 WHEN 'book_2' THEN 80 ELSE 0 END
) AS gs(serial_number)
WHERE e.code IN ('book_1', 'book_2')
ON CONFLICT (edition_id, serial_number) DO NOTHING;

-- Atomic token redemption. This function is callable only by the server-side
-- service role; the browser never receives database write privileges.
CREATE OR REPLACE FUNCTION public.claim_book_registry_entitlement(
  p_token_hash TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entitlement public.book_registry_entitlements%ROWTYPE;
  v_copy public.book_registry_copies%ROWTYPE;
  v_edition public.book_editions%ROWTYPE;
  v_next_serial INTEGER;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS NULL OR p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'invalid_claim_request' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_entitlement
  FROM public.book_registry_entitlements
  WHERE token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'entitlement_invalid';
  END IF;
  IF v_entitlement.status <> 'pending' THEN
    RAISE EXCEPTION 'entitlement_already_used';
  END IF;
  IF v_entitlement.expires_at IS NOT NULL AND v_entitlement.expires_at <= now() THEN
    RAISE EXCEPTION 'entitlement_expired';
  END IF;

  IF v_entitlement.assigned_serial IS NOT NULL THEN
    SELECT * INTO v_copy
    FROM public.book_registry_copies
    WHERE edition_id = v_entitlement.edition_id
      AND serial_number = v_entitlement.assigned_serial
    FOR UPDATE;

    IF NOT FOUND OR v_copy.status <> 'awaiting_claim' OR v_copy.owner_user_id IS NOT NULL THEN
      RAISE EXCEPTION 'historical_slot_unavailable';
    END IF;

    UPDATE public.book_registry_copies
    SET status = 'registered',
        owner_user_id = p_user_id,
        registered_at = now(),
        updated_at = now()
    WHERE id = v_copy.id
    RETURNING * INTO v_copy;
  ELSE
    -- Serialize new serial allocation per edition to avoid duplicate numbers
    -- under concurrent claims.
    PERFORM pg_advisory_xact_lock(hashtext(v_entitlement.edition_id::TEXT));
    SELECT COALESCE(MAX(serial_number), 0) + 1
    INTO v_next_serial
    FROM public.book_registry_copies
    WHERE edition_id = v_entitlement.edition_id;

    INSERT INTO public.book_registry_copies (
      edition_id, serial_number, status, owner_user_id, registered_at
    )
    VALUES (
      v_entitlement.edition_id, v_next_serial, 'registered', p_user_id, now()
    )
    RETURNING * INTO v_copy;
  END IF;

  UPDATE public.book_registry_entitlements
  SET status = 'redeemed',
      redeemed_by = p_user_id,
      redeemed_at = now(),
      redeemed_copy_id = v_copy.id
  WHERE id = v_entitlement.id;

  INSERT INTO public.book_copy_ownership_events (
    copy_id, event_type, actor_user_id, new_owner_user_id, metadata
  )
  VALUES (
    v_copy.id, 'claimed', p_user_id, p_user_id,
    jsonb_build_object('source_type', v_entitlement.source_type)
  );

  SELECT * INTO v_edition
  FROM public.book_editions
  WHERE id = v_copy.edition_id;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'copy_id', v_copy.id,
    'public_id', v_copy.public_id,
    'edition_code', v_edition.code,
    'edition_title', v_edition.title,
    'serial_prefix', v_edition.serial_prefix,
    'serial_number', v_copy.serial_number,
    'printed_copy_number', v_copy.printed_copy_number,
    'status', v_copy.status,
    'map_visible', v_copy.map_visible,
    'location_lat', v_copy.location_lat,
    'location_lng', v_copy.location_lng
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.set_book_registry_location(
  p_public_id UUID,
  p_user_id UUID,
  p_map_visible BOOLEAN,
  p_lat DOUBLE PRECISION DEFAULT NULL,
  p_lng DOUBLE PRECISION DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_copy public.book_registry_copies%ROWTYPE;
  v_lat NUMERIC(5, 2);
  v_lng NUMERIC(6, 2);
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS NULL OR p_public_id IS NULL OR p_map_visible IS NULL THEN
    RAISE EXCEPTION 'invalid_location_request' USING ERRCODE = '22023';
  END IF;

  IF p_map_visible THEN
    IF p_lat IS NULL OR p_lng IS NULL
       OR p_lat < -90 OR p_lat > 90
       OR p_lng < -180 OR p_lng > 180 THEN
      RAISE EXCEPTION 'valid_coordinates_required' USING ERRCODE = '22023';
    END IF;
    -- Persist only a coarse point (about 1 km), never the exact browser location.
    v_lat := round(p_lat::NUMERIC, 2);
    v_lng := round(p_lng::NUMERIC, 2);
  ELSE
    v_lat := NULL;
    v_lng := NULL;
  END IF;

  UPDATE public.book_registry_copies
  SET map_visible = p_map_visible,
      location_lat = v_lat,
      location_lng = v_lng,
      updated_at = now()
  WHERE public_id = p_public_id
    AND owner_user_id = p_user_id
    AND status = 'registered'
  RETURNING * INTO v_copy;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'copy_not_found_or_not_owner';
  END IF;

  INSERT INTO public.book_copy_ownership_events (
    copy_id, event_type, actor_user_id, previous_owner_user_id,
    new_owner_user_id, metadata
  )
  VALUES (
    v_copy.id, 'location_changed', p_user_id, p_user_id, p_user_id,
    jsonb_build_object('map_visible', v_copy.map_visible)
  );

  RETURN jsonb_build_object(
    'ok', TRUE,
    'public_id', v_copy.public_id,
    'map_visible', v_copy.map_visible,
    'location_lat', v_copy.location_lat,
    'location_lng', v_copy.location_lng
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_book_registry_transfer(
  p_public_id UUID,
  p_user_id UUID,
  p_token_hash TEXT,
  p_expires_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_copy public.book_registry_copies%ROWTYPE;
  v_transfer_id UUID;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS NULL OR p_public_id IS NULL
     OR p_token_hash !~ '^[0-9a-f]{64}$'
     OR p_expires_at <= now() OR p_expires_at > now() + INTERVAL '8 days' THEN
    RAISE EXCEPTION 'invalid_transfer_request' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_copy
  FROM public.book_registry_copies
  WHERE public_id = p_public_id
    AND owner_user_id = p_user_id
    AND status = 'registered'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'copy_not_found_or_not_owner';
  END IF;

  UPDATE public.book_copy_transfer_tokens
  SET revoked_at = now()
  WHERE copy_id = v_copy.id
    AND accepted_at IS NULL AND revoked_at IS NULL;

  INSERT INTO public.book_copy_transfer_tokens (
    copy_id, from_user_id, token_hash, expires_at
  )
  VALUES (v_copy.id, p_user_id, p_token_hash, p_expires_at)
  RETURNING id INTO v_transfer_id;

  INSERT INTO public.book_copy_ownership_events (
    copy_id, event_type, actor_user_id, previous_owner_user_id, new_owner_user_id, metadata
  )
  VALUES (
    v_copy.id, 'transfer_started', p_user_id, p_user_id, NULL,
    jsonb_build_object('expires_at', p_expires_at)
  );

  RETURN jsonb_build_object('ok', TRUE, 'transfer_id', v_transfer_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_book_registry_transfer(
  p_token_hash TEXT,
  p_target_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer public.book_copy_transfer_tokens%ROWTYPE;
  v_copy public.book_registry_copies%ROWTYPE;
  v_edition public.book_editions%ROWTYPE;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;
  IF p_target_user_id IS NULL OR p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'invalid_transfer_request' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_transfer
  FROM public.book_copy_transfer_tokens
  WHERE token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND OR v_transfer.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'transfer_invalid';
  END IF;
  IF v_transfer.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'transfer_already_used';
  END IF;
  IF v_transfer.expires_at <= now() THEN
    RAISE EXCEPTION 'transfer_expired';
  END IF;
  IF v_transfer.from_user_id = p_target_user_id THEN
    RAISE EXCEPTION 'transfer_target_must_be_different';
  END IF;

  SELECT * INTO v_copy
  FROM public.book_registry_copies
  WHERE id = v_transfer.copy_id
  FOR UPDATE;

  IF NOT FOUND OR v_copy.owner_user_id <> v_transfer.from_user_id
     OR v_copy.status <> 'registered' THEN
    RAISE EXCEPTION 'transfer_owner_changed';
  END IF;

  UPDATE public.book_registry_copies
  SET owner_user_id = p_target_user_id,
      map_visible = FALSE,
      location_lat = NULL,
      location_lng = NULL,
      updated_at = now()
  WHERE id = v_copy.id
  RETURNING * INTO v_copy;

  UPDATE public.book_copy_transfer_tokens
  SET accepted_at = now()
  WHERE id = v_transfer.id;

  UPDATE public.book_copy_transfer_tokens
  SET revoked_at = now()
  WHERE copy_id = v_copy.id
    AND id <> v_transfer.id
    AND accepted_at IS NULL AND revoked_at IS NULL;

  INSERT INTO public.book_copy_ownership_events (
    copy_id, event_type, actor_user_id, previous_owner_user_id, new_owner_user_id, metadata
  )
  VALUES (
    v_copy.id, 'transferred', p_target_user_id,
    v_transfer.from_user_id, p_target_user_id, '{}'::JSONB
  );

  SELECT * INTO v_edition
  FROM public.book_editions
  WHERE id = v_copy.edition_id;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'public_id', v_copy.public_id,
    'edition_code', v_edition.code,
    'edition_title', v_edition.title,
    'serial_prefix', v_edition.serial_prefix,
    'serial_number', v_copy.serial_number,
    'map_visible', FALSE
  );
END;
$$;

-- All registry tables are server-only. Public data is returned through narrow API
-- projections, not through direct PostgREST table access.
ALTER TABLE public.book_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_registry_copies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_registry_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_copy_ownership_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_copy_transfer_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS book_editions_service_role_all ON public.book_editions;
CREATE POLICY book_editions_service_role_all ON public.book_editions
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
DROP POLICY IF EXISTS book_registry_copies_service_role_all ON public.book_registry_copies;
CREATE POLICY book_registry_copies_service_role_all ON public.book_registry_copies
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
DROP POLICY IF EXISTS book_registry_entitlements_service_role_all ON public.book_registry_entitlements;
CREATE POLICY book_registry_entitlements_service_role_all ON public.book_registry_entitlements
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
DROP POLICY IF EXISTS book_copy_ownership_events_service_role_all ON public.book_copy_ownership_events;
CREATE POLICY book_copy_ownership_events_service_role_all ON public.book_copy_ownership_events
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
DROP POLICY IF EXISTS book_copy_transfer_tokens_service_role_all ON public.book_copy_transfer_tokens;
CREATE POLICY book_copy_transfer_tokens_service_role_all ON public.book_copy_transfer_tokens
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

REVOKE ALL ON public.book_editions, public.book_registry_copies,
  public.book_registry_entitlements, public.book_copy_ownership_events,
  public.book_copy_transfer_tokens FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.book_editions, public.book_registry_copies,
  public.book_registry_entitlements, public.book_copy_ownership_events,
  public.book_copy_transfer_tokens TO service_role;

REVOKE ALL ON FUNCTION public.claim_book_registry_entitlement(TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_book_registry_location(UUID, UUID, BOOLEAN, DOUBLE PRECISION, DOUBLE PRECISION) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_book_registry_transfer(UUID, UUID, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.accept_book_registry_transfer(TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_book_registry_entitlement(TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_book_registry_location(UUID, UUID, BOOLEAN, DOUBLE PRECISION, DOUBLE PRECISION) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_book_registry_transfer(UUID, UUID, TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.accept_book_registry_transfer(TEXT, UUID) TO service_role;
