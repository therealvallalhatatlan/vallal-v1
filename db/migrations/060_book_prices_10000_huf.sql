-- Standardize both printed book editions at 10,000 HUF, with delivery charged separately.

ALTER TABLE public.distribution_drops
  ALTER COLUMN price_huf SET DEFAULT 10000;

UPDATE public.distribution_drops
SET price_huf = 10000,
    updated_at = now()
WHERE lower(product_id) IN ('book_ii', 'book-2', 'book_2', 'book-ii', 'book-1', 'book_1', 'book-i')
  AND status = 'active'
  AND price_huf = 15000;

UPDATE public.distribution_cell_inventory
SET unit_price_huf = 10000,
    updated_at = now()
WHERE lower(product_id) IN ('book_ii', 'book-2', 'book_2', 'book-ii', 'book-1', 'book_1', 'book-i')
  AND unit_price_huf = 15000;
