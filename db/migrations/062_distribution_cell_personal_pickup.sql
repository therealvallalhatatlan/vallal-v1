-- Public distributor pickup settings. Exact pickup coordinates and instructions remain private
-- and are shared only through the order fulfillment workflow after appointment confirmation.

ALTER TABLE public.distribution_cells
  ADD COLUMN IF NOT EXISTS pickup_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pickup_public_name TEXT,
  ADD COLUMN IF NOT EXISTS pickup_area TEXT,
  ADD COLUMN IF NOT EXISTS pickup_description TEXT,
  ADD COLUMN IF NOT EXISTS pickup_sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS distribution_cells_public_pickup_idx
  ON public.distribution_cells(status, pickup_enabled, pickup_sort_order, city, name);

COMMENT ON COLUMN public.distribution_cells.pickup_enabled IS
  'Whether this distribution cell appears as an in-person book pickup option at checkout.';
COMMENT ON COLUMN public.distribution_cells.pickup_public_name IS
  'Public-facing name of the pickup point. Do not store a private street address here.';
COMMENT ON COLUMN public.distribution_cells.pickup_area IS
  'Public area/neighborhood hint shown before payment. The exact meeting location is shared later.';
