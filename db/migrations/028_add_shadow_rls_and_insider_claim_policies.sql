-- Migration: 028_add_shadow_rls_and_insider_claim_policies.sql
-- Restrict phantom tables to insider claim / role

CREATE OR REPLACE FUNCTION shadow_claim_text(claim_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  raw_value TEXT;
BEGIN
  raw_value := auth.jwt() ->> claim_key;
  IF raw_value IS NOT NULL AND btrim(raw_value) <> '' THEN
    RETURN raw_value;
  END IF;

  raw_value := auth.jwt() -> 'app_metadata' ->> claim_key;
  IF raw_value IS NOT NULL AND btrim(raw_value) <> '' THEN
    RETURN raw_value;
  END IF;

  raw_value := auth.jwt() -> 'user_metadata' ->> claim_key;
  IF raw_value IS NOT NULL AND btrim(raw_value) <> '' THEN
    RETURN raw_value;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION shadow_has_insider_claim()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  insider_text TEXT;
  role_text TEXT;
BEGIN
  insider_text := lower(COALESCE(shadow_claim_text('insider'), 'false'));
  IF insider_text IN ('1', 't', 'true', 'yes', 'y', 'on') THEN
    RETURN TRUE;
  END IF;

  role_text := lower(COALESCE(shadow_claim_text('role'), ''));
  IF role_text = 'insider' THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION shadow_session_id_from_claim()
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claim_value TEXT;
BEGIN
  claim_value := shadow_claim_text('shadow_session_id');
  IF claim_value IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    RETURN claim_value::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$;

ALTER TABLE shadow_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shadow_drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE shadow_drop_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shadow_profiles_insider_own_read" ON shadow_profiles
  FOR SELECT
  USING (
    shadow_has_insider_claim()
    AND session_id = shadow_session_id_from_claim()
  );

CREATE POLICY "shadow_profiles_insider_own_update" ON shadow_profiles
  FOR UPDATE
  USING (
    shadow_has_insider_claim()
    AND session_id = shadow_session_id_from_claim()
  )
  WITH CHECK (
    shadow_has_insider_claim()
    AND session_id = shadow_session_id_from_claim()
  );

CREATE POLICY "shadow_profiles_service_insert" ON shadow_profiles
  FOR INSERT WITH CHECK (FALSE);

CREATE POLICY "shadow_drops_insider_read" ON shadow_drops
  FOR SELECT
  USING (shadow_has_insider_claim());

CREATE POLICY "shadow_drops_insider_write" ON shadow_drops
  FOR ALL
  USING (shadow_has_insider_claim())
  WITH CHECK (shadow_has_insider_claim());

CREATE POLICY "shadow_drop_claims_insider_read" ON shadow_drop_claims
  FOR SELECT
  USING (shadow_has_insider_claim());

CREATE POLICY "shadow_drop_claims_insider_write" ON shadow_drop_claims
  FOR ALL
  USING (shadow_has_insider_claim())
  WITH CHECK (shadow_has_insider_claim());
