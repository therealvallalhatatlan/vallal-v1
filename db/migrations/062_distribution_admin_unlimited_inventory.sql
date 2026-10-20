-- Track whether a drop consumed a physical stock unit.
-- Existing drops reserved a unit; admin-created unlimited drops do not.
ALTER TABLE public.distribution_drops
  ADD COLUMN IF NOT EXISTS inventory_reserved boolean NOT NULL DEFAULT true;
