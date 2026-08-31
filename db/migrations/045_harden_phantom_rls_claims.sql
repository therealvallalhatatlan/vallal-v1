-- Phantom security hardening
-- IMPORTANT: user_metadata is user-controlled and must never grant insider privileges.

CREATE OR REPLACE FUNCTION shadow_claim_text(claim_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  raw_value TEXT;
BEGIN
  -- Top-level custom claims are trusted only when injected into the JWT by the auth system.
  raw_value := auth.jwt() ->> claim_key;
  IF raw_value IS NOT NULL AND btrim(raw_value) <> '' THEN
    RETURN raw_value;
  END IF;

  -- app_metadata is server-managed. Do NOT fall back to user_metadata here.
  raw_value := auth.jwt() -> 'app_metadata' ->> claim_key;
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
  RETURN role_text = 'insider';
END;
$$;

-- Rebuild policies so the privilege check is evaluated from trusted claims only.
DROP POLICY IF EXISTS "shadow_profiles_insider_own_read" ON shadow_profiles;
CREATE POLICY "shadow_profiles_insider_own_read" ON shadow_profiles
  FOR SELECT
  USING (
    shadow_has_insider_claim()
    AND session_id = shadow_session_id_from_claim()
  );

DROP POLICY IF EXISTS "shadow_profiles_insider_own_update" ON shadow_profiles;
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

DROP POLICY IF EXISTS "shadow_drops_insider_read" ON shadow_drops;
CREATE POLICY "shadow_drops_insider_read" ON shadow_drops
  FOR SELECT
  USING (shadow_has_insider_claim());

DROP POLICY IF EXISTS "shadow_drops_insider_write" ON shadow_drops;
CREATE POLICY "shadow_drops_insider_write" ON shadow_drops
  FOR ALL
  USING (shadow_has_insider_claim())
  WITH CHECK (shadow_has_insider_claim());

DROP POLICY IF EXISTS "shadow_drop_claims_insider_read" ON shadow_drop_claims;
CREATE POLICY "shadow_drop_claims_insider_read" ON shadow_drop_claims
  FOR SELECT
  USING (shadow_has_insider_claim());

DROP POLICY IF EXISTS "shadow_drop_claims_insider_write" ON shadow_drop_claims;
CREATE POLICY "shadow_drop_claims_insider_write" ON shadow_drop_claims
  FOR ALL
  USING (shadow_has_insider_claim())
  WITH CHECK (shadow_has_insider_claim());
