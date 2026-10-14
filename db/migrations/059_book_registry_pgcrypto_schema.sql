-- Fix schema qualification for pgcrypto functions used by the
-- purchase-gated registry RPC. The function's search_path is intentionally
-- restricted to public, so pgcrypto functions must use the extensions schema.
CREATE OR REPLACE FUNCTION public.register_book_registry_copy(
  p_edition_code TEXT,
  p_user_id UUID,
  p_user_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_edition public.book_editions%ROWTYPE;
  v_candidate RECORD;
  v_cutoff TIMESTAMPTZ;
  v_copy public.book_registry_copies%ROWTYPE;
  v_entitlement public.book_registry_entitlements%ROWTYPE;
  v_serial INTEGER;
  v_reserved_max INTEGER;
  v_had_candidate BOOLEAN := FALSE;
  v_had_unconsumed BOOLEAN := FALSE;
  v_purchase_units INTEGER := 0;
  v_claimed_count INTEGER := 0;
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
  IF NOT FOUND THEN RAISE EXCEPTION 'edition_not_found'; END IF;

  -- One allocator at a time per edition, even if two copies are claimed at once.
  PERFORM pg_advisory_xact_lock(hashtext(v_edition.id::TEXT));

  SELECT legacy_cutoff_at INTO v_cutoff
  FROM public.book_registry_rollout_cutover
  WHERE id = TRUE;
  v_cutoff := COALESCE(v_cutoff, now());
  v_reserved_max := CASE p_edition_code WHEN 'book_1' THEN 100 ELSE 80 END;

  SELECT COUNT(*)::INTEGER INTO v_purchase_units
  FROM public.book_registry_purchase_candidates(p_edition_code, p_user_id, p_user_email);
  SELECT COUNT(DISTINCT ev.copy_id)::INTEGER INTO v_claimed_count
  FROM public.book_copy_ownership_events ev
  JOIN public.book_registry_copies c ON c.id = ev.copy_id
  JOIN public.book_editions ed ON ed.id = c.edition_id
  WHERE ev.event_type = 'claimed'
    AND ev.actor_user_id = p_user_id
    AND ev.new_owner_user_id = p_user_id
    AND ed.code = p_edition_code;
  IF v_purchase_units = 0 THEN
    RAISE EXCEPTION 'purchase_required';
  ELSIF v_claimed_count >= v_purchase_units THEN
    RAISE EXCEPTION 'purchase_already_used';
  END IF;

  FOR v_candidate IN
    SELECT * FROM public.book_registry_purchase_candidates(p_edition_code, p_user_id, p_user_email)
    ORDER BY purchased_at, source_reference
  LOOP
    v_had_candidate := TRUE;

    SELECT * INTO v_entitlement
    FROM public.book_registry_entitlements e
    WHERE e.source_type = 'purchase'
      AND e.source_reference = v_candidate.source_reference
    LIMIT 1;

    IF FOUND AND v_entitlement.status IN ('redeemed', 'revoked') THEN
      CONTINUE;
    END IF;
    v_had_unconsumed := TRUE;

    IF v_candidate.purchased_at <= v_cutoff THEN
      IF v_candidate.preferred_serial BETWEEN 1 AND v_reserved_max THEN
        SELECT c.* INTO v_copy
        FROM public.book_registry_copies c
        WHERE c.edition_id = v_edition.id
          AND c.serial_number = v_candidate.preferred_serial
          AND c.status = 'awaiting_claim'
          AND c.owner_user_id IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM public.book_registry_entitlements e
            WHERE e.edition_id = c.edition_id
              AND e.assigned_serial = c.serial_number
              AND e.status <> 'revoked'
          )
        FOR UPDATE;
      ELSE
        SELECT c.* INTO v_copy
        FROM public.book_registry_copies c
        WHERE c.edition_id = v_edition.id
          AND c.serial_number BETWEEN 1 AND v_reserved_max
          AND c.status = 'awaiting_claim'
          AND c.owner_user_id IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM public.book_registry_entitlements e
            WHERE e.edition_id = c.edition_id
              AND e.assigned_serial = c.serial_number
              AND e.status <> 'revoked'
          )
        ORDER BY c.serial_number
        LIMIT 1
        FOR UPDATE;
      END IF;

      IF NOT FOUND THEN
        CONTINUE;
      END IF;

      UPDATE public.book_registry_copies
      SET status = 'registered',
          owner_user_id = p_user_id,
          registered_at = now(),
          updated_at = now()
      WHERE id = v_copy.id
      RETURNING * INTO v_copy;
      v_serial := v_copy.serial_number;
    ELSE
      SELECT COALESCE(MAX(c.serial_number), 0) + 1 INTO v_serial
      FROM public.book_registry_copies c
      WHERE c.edition_id = v_edition.id;

      INSERT INTO public.book_registry_copies (
        edition_id, serial_number, status, owner_user_id, registered_at
      )
      VALUES (v_edition.id, v_serial, 'registered', p_user_id, now())
      RETURNING * INTO v_copy;
    END IF;

    IF FOUND AND v_entitlement.id IS NOT NULL AND v_entitlement.status = 'pending' THEN
      UPDATE public.book_registry_entitlements
      SET status = 'redeemed',
          redeemed_by = p_user_id,
          redeemed_at = now(),
          redeemed_copy_id = v_copy.id
      WHERE id = v_entitlement.id;
    ELSE
      INSERT INTO public.book_registry_entitlements (
        edition_id, token_hash, source_type, source_reference,
        status, redeemed_by, redeemed_at, redeemed_copy_id
      )
      VALUES (
        v_edition.id,
        encode(extensions.digest(extensions.gen_random_bytes(32), 'sha256'), 'hex'),
        'purchase',
        v_candidate.source_reference,
        'redeemed',
        p_user_id,
        now(),
        v_copy.id
      );
    END IF;

    INSERT INTO public.book_copy_ownership_events (
      copy_id, event_type, actor_user_id, new_owner_user_id, metadata
    )
    VALUES (
      v_copy.id, 'claimed', p_user_id, p_user_id,
      jsonb_build_object('source_type', 'verified_purchase')
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
  END LOOP;

  IF NOT v_had_candidate THEN
    RAISE EXCEPTION 'purchase_required';
  ELSIF NOT v_had_unconsumed THEN
    RAISE EXCEPTION 'purchase_already_used';
  END IF;
  RAISE EXCEPTION 'historical_slot_unavailable';
END;
$$;

REVOKE ALL ON FUNCTION public.register_book_registry_copy(TEXT, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_book_registry_copy(TEXT, UUID, TEXT)
  TO service_role;
