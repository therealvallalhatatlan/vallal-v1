ALTER TABLE public.distribution_drops
  ADD COLUMN IF NOT EXISTS photo_paths text[] NOT NULL DEFAULT ARRAY[]::text[];

ALTER TABLE public.distribution_drops
  DROP CONSTRAINT IF EXISTS distribution_drops_status_check;

ALTER TABLE public.distribution_drops
  ADD CONSTRAINT distribution_drops_status_check
  CHECK (status = ANY (ARRAY[
    'active'::text,
    'inactive'::text,
    'reserved'::text,
    'purchased'::text,
    'collected'::text,
    'cancelled'::text,
    'expired'::text
  ]));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'distribution-drop-photos',
  'distribution-drop-photos',
  false,
  4194304,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
