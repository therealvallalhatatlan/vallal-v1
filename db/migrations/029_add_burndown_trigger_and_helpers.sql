-- Migration: 029_add_burndown_trigger_and_helpers.sql
-- Invite-web cascading sanction: EXECUTE BURNDOWN

CREATE TABLE IF NOT EXISTS shadow_audit_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_type TEXT NOT NULL,
  target_session_id UUID,
  sponsor_session_id UUID,
  actor_uid UUID,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shadow_audit_events_event_type_time
  ON shadow_audit_events (event_type, created_at DESC);

CREATE OR REPLACE FUNCTION shadow_execute_burndown(
  p_target_session_id UUID,
  p_reason TEXT DEFAULT 'EXECUTE BURNDOWN'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target shadow_profiles%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT *
  INTO v_target
  FROM shadow_profiles
  WHERE session_id = p_target_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO shadow_audit_events (event_type, target_session_id, actor_uid, details)
    VALUES (
      'burndown_missing_target',
      p_target_session_id,
      auth.uid(),
      jsonb_build_object('reason', COALESCE(p_reason, 'EXECUTE BURNDOWN'))
    );
    RETURN;
  END IF;

  UPDATE shadow_profiles
  SET
    banned_at = v_now,
    burn_reason = COALESCE(NULLIF(p_reason, ''), 'EXECUTE BURNDOWN'),
    insider_enabled = FALSE
  WHERE session_id IN (v_target.session_id, v_target.sponsor_id);

  INSERT INTO shadow_audit_events (event_type, target_session_id, sponsor_session_id, actor_uid, details)
  VALUES (
    'burndown_executed',
    v_target.session_id,
    v_target.sponsor_id,
    auth.uid(),
    jsonb_build_object('reason', COALESCE(NULLIF(p_reason, ''), 'EXECUTE BURNDOWN'))
  );

  DELETE FROM shadow_profiles
  WHERE session_id IN (v_target.session_id, v_target.sponsor_id);
END;
$$;

CREATE OR REPLACE FUNCTION shadow_profiles_burndown_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.burn_now = TRUE AND COALESCE(OLD.burn_now, FALSE) = FALSE THEN
    PERFORM shadow_execute_burndown(
      NEW.session_id,
      COALESCE(NULLIF(NEW.burn_reason, ''), 'EXECUTE BURNDOWN')
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_shadow_profiles_execute_burndown ON shadow_profiles;

CREATE TRIGGER trg_shadow_profiles_execute_burndown
  AFTER UPDATE OF burn_now ON shadow_profiles
  FOR EACH ROW
  EXECUTE FUNCTION shadow_profiles_burndown_trigger();
