-- Paid-purchase gate for book registry self-service.
-- The cutoff separates already-sold physical copies from purchases made after
-- registry launch. Existing paid orders consume the reserved historical range;
-- new paid orders receive the next serial after that range.
CREATE TABLE IF NOT EXISTS public.book_registry_rollout_cutover (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  legacy_cutoff_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.book_registry_rollout_cutover (id)
VALUES (TRUE)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.book_registry_rollout_cutover ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.book_registry_rollout_cutover FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.book_registry_rollout_cutover TO service_role;

CREATE OR REPLACE FUNCTION public.book_registry_purchase_candidates(
  p_edition_code TEXT,
  p_user_id UUID,
  p_user_email TEXT
)
RETURNS TABLE (
  source_reference TEXT,
  purchased_at TIMESTAMPTZ,
  preferred_serial INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS NULL OR p_edition_code NOT IN ('book_1', 'book_2') THEN
    RAISE EXCEPTION 'invalid_registration_request' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH order_units AS (
    SELECT
      o.id AS order_id,
      o.created_at AS order_created_at,
      o.stripe_session_id,
      o.metadata,
      gs.unit_number::INTEGER AS unit_number,
      CASE
        WHEN COALESCE(o.metadata->>'copy_number', '') ~ '^[0-9]{1,3}$'
          THEN (o.metadata->>'copy_number')::INTEGER
        ELSE NULL
      END AS preferred_serial
    FROM public.orders o
    CROSS JOIN LATERAL generate_series(
      1,
      CASE
        WHEN COALESCE(o.metadata->>('book_registry_' || p_edition_code || '_quantity'), '') ~ '^[0-9]{1,3}$'
          THEN LEAST(GREATEST((o.metadata->>('book_registry_' || p_edition_code || '_quantity'))::INTEGER, 1), 100)
        WHEN COALESCE(o.metadata->>'book_registry_quantity', '') ~ '^[0-9]{1,3}$'
          THEN LEAST(GREATEST((o.metadata->>'book_registry_quantity')::INTEGER, 1), 100)
        ELSE 1
      END
    ) AS gs(unit_number)
    WHERE o.status = 'paid'
      AND (
        o.user_id = p_user_id
        OR (
          NULLIF(BTRIM(p_user_email), '') IS NOT NULL
          AND LOWER(BTRIM(o.customer_email)) = LOWER(BTRIM(p_user_email))
        )
        OR (
          NULLIF(BTRIM(p_user_email), '') IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.users legacy_user
            WHERE legacy_user.id = o.legacy_public_user_id
              AND LOWER(BTRIM(legacy_user.email)) = LOWER(BTRIM(p_user_email))
          )
        )
      )
      AND (
        (p_edition_code = 'book_1' AND LOWER(COALESCE(o.product_id, '')) IN ('book-1', 'book_1', 'book-i', 'book_i'))
        OR (p_edition_code = 'book_2' AND LOWER(COALESCE(o.product_id, '')) IN ('book-2', 'book_2', 'book-ii', 'book_ii'))
        OR LOWER(COALESCE(o.metadata->>'book_registry_edition', '')) = p_edition_code
        OR (
          COALESCE(o.metadata->>'book_registry_' || p_edition_code || '_quantity', '') ~ '^[1-9][0-9]{0,2}$'
        )
        OR (
          o.metadata->>'historical_data_recovered' = 'true'
          AND o.metadata->>'historical_product_type' = 'book'
          AND o.metadata->>'historical_edition' = p_edition_code
        )
      )
  ),
  order_candidates AS (
    SELECT
      CASE
        WHEN NULLIF(BTRIM(stripe_session_id), '') IS NOT NULL
          THEN 'stripe:' || BTRIM(stripe_session_id) || ':' || p_edition_code || ':' || unit_number::TEXT
        ELSE 'paid-order:' || order_id::TEXT || ':' || p_edition_code || ':' || unit_number::TEXT
      END AS candidate_reference,
      order_created_at AS candidate_purchased_at,
      preferred_serial AS candidate_preferred_serial
    FROM order_units
  ),
  shop_item_units AS (
    SELECT
      so.id AS order_id,
      so.created_at AS order_created_at,
      so.stripe_checkout_session_id,
      si.id AS item_id,
      si.created_at AS item_created_at,
      gs.unit_number::INTEGER AS unit_number,
      ROW_NUMBER() OVER (
        PARTITION BY so.id
        ORDER BY si.created_at, si.id, gs.unit_number
      )::INTEGER AS edition_unit_number
    FROM public.shop_orders so
    JOIN public.shop_order_items si ON si.order_id = so.id
    CROSS JOIN LATERAL generate_series(1, LEAST(GREATEST(si.quantity, 1), 100)) AS gs(unit_number)
    WHERE so.status = 'paid'
      AND si.product_type = 'book'
      AND (
        (p_edition_code = 'book_1' AND LOWER(si.product_id) IN ('book-1', 'book_1'))
        OR (p_edition_code = 'book_2' AND LOWER(si.product_id) IN ('book-2', 'book_2'))
      )
      AND (
        so.user_id = p_user_id
        OR (
          NULLIF(BTRIM(p_user_email), '') IS NOT NULL
          AND LOWER(BTRIM(so.customer_email)) = LOWER(BTRIM(p_user_email))
        )
      )
  ),
  shop_candidates AS (
    SELECT
      CASE
        WHEN NULLIF(BTRIM(stripe_checkout_session_id), '') IS NOT NULL
          THEN 'stripe:' || BTRIM(stripe_checkout_session_id) || ':' || p_edition_code || ':' || edition_unit_number::TEXT
        ELSE 'paid-shop-order:' || order_id::TEXT || ':' || item_id::TEXT || ':' || unit_number::TEXT
      END AS candidate_reference,
      order_created_at AS candidate_purchased_at,
      NULL::INTEGER AS candidate_preferred_serial
    FROM shop_item_units
  ),
  combined_candidates AS (
    SELECT * FROM order_candidates
    UNION ALL
    SELECT * FROM shop_candidates
  ),
  deduplicated AS (
    SELECT DISTINCT ON (candidate_reference)
      candidate_reference, candidate_purchased_at, candidate_preferred_serial
    FROM combined_candidates
    ORDER BY candidate_reference, (candidate_preferred_serial IS NULL), candidate_purchased_at
  )
  SELECT
    d.candidate_reference,
    d.candidate_purchased_at,
    d.candidate_preferred_serial
  FROM deduplicated d
  ORDER BY d.candidate_purchased_at, d.candidate_reference;
END;
$$;

REVOKE ALL ON FUNCTION public.book_registry_purchase_candidates(TEXT, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.book_registry_purchase_candidates(TEXT, UUID, TEXT)
  TO service_role;

CREATE OR REPLACE FUNCTION public.preview_book_registry_registration(
  p_edition_code TEXT,
  p_user_id UUID,
  p_user_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  v_edition public.book_editions%ROWTYPE;
  v_candidate RECORD;
  v_cutoff TIMESTAMPTZ;
  v_copy public.book_registry_copies%ROWTYPE;
  v_serial INTEGER;
  v_reserved_max INTEGER;
  v_had_candidate BOOLEAN := FALSE;
  v_had_unconsumed BOOLEAN := FALSE;
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

  SELECT legacy_cutoff_at INTO v_cutoff
  FROM public.book_registry_rollout_cutover
  WHERE id = TRUE;
  v_cutoff := COALESCE(v_cutoff, now());
  v_reserved_max := CASE p_edition_code WHEN 'book_1' THEN 100 ELSE 80 END;

  SELECT COUNT(*)::INTEGER INTO v_purchase_units
  FROM public.book_registry_purchase_candidates(p_edition_code, p_user_id, p_user_email);
  SELECT COUNT(DISTINCT ev.copy_id)::INTEGER INTO v_claimed_count
  FROM public.book_copy_ownership_events ev
  WHERE ev.event_type = 'claimed'
    AND ev.actor_user_id = p_user_id
    AND ev.new_owner_user_id = p_user_id;
  IF v_purchase_units = 0 THEN
    RETURN jsonb_build_object('ok', TRUE, 'eligible', FALSE, 'reason', 'purchase_required');
  ELSIF v_claimed_count >= v_purchase_units THEN
    RETURN jsonb_build_object('ok', TRUE, 'eligible', FALSE, 'reason', 'purchase_already_used');
  END IF;

  FOR v_candidate IN
    SELECT * FROM public.book_registry_purchase_candidates(p_edition_code, p_user_id, p_user_email)
    ORDER BY purchased_at, source_reference
  LOOP
    v_had_candidate := TRUE;

    IF EXISTS (
      SELECT 1
      FROM public.book_registry_entitlements e
      WHERE e.source_type = 'purchase'
        AND e.source_reference = v_candidate.source_reference
        AND e.status IN ('redeemed', 'revoked')
    ) THEN
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
        LIMIT 1;
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
        LIMIT 1;
      END IF;

      IF FOUND THEN
        v_serial := v_copy.serial_number;
        RETURN jsonb_build_object(
          'ok', TRUE, 'eligible', TRUE,
          'suggestion', jsonb_build_object(
            'editionCode', v_edition.code,
            'editionTitle', v_edition.title,
            'serialPrefix', v_edition.serial_prefix,
            'serialNumber', v_serial,
            'serialLabel', v_edition.serial_prefix || '-' || lpad(v_serial::TEXT, 3, '0')
          )
        );
      END IF;
    ELSE
      SELECT COALESCE(MAX(c.serial_number), 0) + 1 INTO v_serial
      FROM public.book_registry_copies c
      WHERE c.edition_id = v_edition.id;

      RETURN jsonb_build_object(
        'ok', TRUE, 'eligible', TRUE,
        'suggestion', jsonb_build_object(
          'editionCode', v_edition.code,
          'editionTitle', v_edition.title,
          'serialPrefix', v_edition.serial_prefix,
          'serialNumber', v_serial,
          'serialLabel', v_edition.serial_prefix || '-' || lpad(v_serial::TEXT, 3, '0')
        )
      );
    END IF;
  END LOOP;

  IF NOT v_had_candidate THEN
    RETURN jsonb_build_object('ok', TRUE, 'eligible', FALSE, 'reason', 'purchase_required');
  ELSIF NOT v_had_unconsumed THEN
    RETURN jsonb_build_object('ok', TRUE, 'eligible', FALSE, 'reason', 'purchase_already_used');
  END IF;

  RETURN jsonb_build_object('ok', TRUE, 'eligible', FALSE, 'reason', 'historical_slot_unavailable');
END;
$$;

REVOKE ALL ON FUNCTION public.preview_book_registry_registration(TEXT, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.preview_book_registry_registration(TEXT, UUID, TEXT)
  TO service_role;

CREATE OR REPLACE FUNCTION public.register_book_registry_copy(
  p_edition_code TEXT,
  p_user_id UUID,
  p_user_email TEXT DEFAULT NULL
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
  WHERE ev.event_type = 'claimed'
    AND ev.actor_user_id = p_user_id
    AND ev.new_owner_user_id = p_user_id;
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
        encode(digest(gen_random_bytes(32), 'sha256'), 'hex'),
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

-- Compatibility overload for app instances that are still rolling out.
-- It remains purchase-gated, so the older endpoint cannot bypass the new check.
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
  v_user_email TEXT;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;

  SELECT CASE WHEN u.email_confirmed_at IS NOT NULL THEN u.email ELSE NULL END
    INTO v_user_email
  FROM auth.users u
  WHERE u.id = p_user_id;

  RETURN public.register_book_registry_copy(p_edition_code, p_user_id, v_user_email);
END;
$$;

REVOKE ALL ON FUNCTION public.register_book_registry_copy(TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_book_registry_copy(TEXT, UUID)
  TO service_role;
