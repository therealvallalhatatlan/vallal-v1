-- Fix PL/pgSQL ambiguity between the RETURNS TABLE output variable
-- named preferred_serial and the order_units CTE column of the same name.
-- Qualify the CTE column explicitly; this does not modify any rows.
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
          COALESCE(o.metadata->>('book_registry_' || p_edition_code || '_quantity'), '') ~ '^[1-9][0-9]{0,2}$'
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
      ou.preferred_serial AS candidate_preferred_serial
    FROM order_units AS ou
  ),
  shop_item_units AS (
    SELECT
      so.id AS order_id,
      COALESCE(so.paid_at, so.created_at) AS order_created_at,
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
