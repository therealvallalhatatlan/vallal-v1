-- Migration: 031_add_pg_cron_burn_protocol.sql
-- Burn protocol: hard-delete claimed shadow drops after 10 minutes

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION phantom_burn_claimed_drops()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INT := 0;
BEGIN
  WITH doomed AS (
    SELECT c.drop_id
    FROM shadow_drop_claims c
    WHERE c.claimed_at <= NOW() - INTERVAL '10 minutes'
  ), deleted AS (
    DELETE FROM shadow_drops d
    USING doomed
    WHERE d.id = doomed.drop_id
    RETURNING d.id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;

  RETURN COALESCE(v_deleted_count, 0);
END;
$$;

DO $job$
DECLARE
  v_job_id BIGINT;
BEGIN
  SELECT jobid
  INTO v_job_id
  FROM cron.job
  WHERE jobname = 'phantom_burn_protocol'
  LIMIT 1;

  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;

  PERFORM cron.schedule(
    'phantom_burn_protocol',
    '* * * * *',
    $cmd$SELECT public.phantom_burn_claimed_drops();$cmd$
  );
END;
$job$;
