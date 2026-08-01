ALTER TABLE public.film_supports
  DROP CONSTRAINT IF EXISTS film_supports_amount_check,
  ADD CONSTRAINT film_supports_amount_check CHECK (amount >= 0);

COMMENT ON CONSTRAINT film_supports_amount_check ON public.film_supports
  IS 'Allow zero-forint supporters so we can save votes without payments.';