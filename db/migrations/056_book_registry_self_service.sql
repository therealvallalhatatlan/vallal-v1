-- Self-service registration for a physical book the signed-in user owns.
-- Historical serial ranges remain reserved by migration 054; this always allocates
-- the next number after the highest reserved/registered serial for the selected edition.

CREATE OR REPLACE FUNCTION public.register_book_registry_copy(
  p_edition_code TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_edition public.book_editions%ROWTYPE;
  v_copy public.book_registry_copies%ROWTYPE;
  v_next_serial INTEGER;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL OR p_edition_code NOT IN ('book_1', 'book_2') THEN
    RAISE EXCEPTION 'invalid_registration_request' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_edition
  FROM public.book_editions
  WHERE code = p_edition_code AND is_active = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'edition_not_found';
  END IF;

  -- Serialize allocations for this edition to prevent duplicate numbers.
  PERFORM pg_advisory_xact_lock(hashtext(v_edition.id::TEXT));

  SELECT COALESCE(MAX(serial_number), 0) + 1
    INTO v_next_serial
  FROM public.book_registry_copies
  WHERE edition_id = v_edition.id;

  INSERT INTO public.book_registry_copies (
    edition_id, serial_number, status, owner_user_id, registered_at
  )
  VALUES (
    v_edition.id, v_next_serial, 'registered', p_user_id, now()
  )
  RETURNING * INTO v_copy;

  INSERT INTO public.book_copy_ownership_events (
    copy_id, event_type, actor_user_id, new_owner_user_id, metadata
  )
  VALUES (
    v_copy.id, 'claimed', p_user_id, p_user_id,
    jsonb_build_object('source_type', 'self_service', 'ownership_attested', TRUE)
  );

  RETURN jsonb_build_object(
    'ok', TRUE,
    'copy_id', v_copy.id,
    'public_id', v_copy.public_id,
    'edition_code', v_edition.code,
    'edition_title', v_edition.title,
    'serial_prefix', v_edition.serial_prefix,
    'serial_number', v_copy.serial_number,
    'serial_label', v_edition.serial_prefix || '-' || lpad(v_copy.serial_number::TEXT, 3, '0'),
    'printed_copy_number', v_copy.printed_copy_number,
    'status', v_copy.status,
    'map_visible', v_copy.map_visible,
    'location_lat', v_copy.location_lat,
    'location_lng', v_copy.location_lng
  );
END;
$$;

REVOKE ALL ON FUNCTION public.register_book_registry_copy(TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_book_registry_copy(TEXT, UUID)
  TO service_role;
