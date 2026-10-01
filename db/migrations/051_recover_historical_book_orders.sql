-- Historical recovery for legacy book orders.
--
-- The original 2025 Stripe flow sometimes created paid orders with
-- product_id='unknown' and empty metadata. The payment records remain valid,
-- but the product classification and numbered-copy relation were lost.
--
-- We preserve the original product_id and annotate only the historical
-- classification needed by the current badge/account logic.
--
-- Scope is intentionally limited to 2025 paid physical dead-drop orders that
-- still have product_id='unknown'. Current 2026 traffic is not touched.

UPDATE public.orders
SET metadata =
  COALESCE(metadata, '{}'::jsonb)
  || jsonb_build_object(
    'historical_product_type', 'book',
    'historical_edition', 'book_1',
    'historical_data_recovered', true,
    'original_product_id', COALESCE(NULLIF(product_id, ''), 'unknown')
  )
WHERE status IN ('paid', 'ready_to_dispatch', 'dispatched', 'fulfilled')
  AND delivery_type = 'dead_drop'
  AND product_id = 'unknown'
  AND created_at >= TIMESTAMPTZ '2025-01-01 00:00:00+00'
  AND created_at < TIMESTAMPTZ '2026-01-01 00:00:00+00';

-- Verification summary.
SELECT
  COUNT(*) AS recovered_orders,
  COALESCE(SUM(amount), 0) / 100.0 AS recovered_huf
FROM public.orders
WHERE metadata->>'historical_data_recovered' = 'true'
  AND metadata->>'historical_product_type' = 'book'
  AND metadata->>'historical_edition' = 'book_1';
