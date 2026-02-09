-- Kill Switch / Proof-of-Control System
-- Single-row table for global system mode control

-- Create enum for system modes
CREATE TYPE system_mode AS ENUM ('SAFE', 'READ_ONLY');

-- Control table (single row, enforced by policy)
CREATE TABLE IF NOT EXISTS system_control (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- only allow one row
  mode system_mode NOT NULL DEFAULT 'SAFE',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT NOT NULL DEFAULT 'system'
);

-- Audit/history table for tamper-proof logging
CREATE TABLE IF NOT EXISTS system_control_history (
  id SERIAL PRIMARY KEY,
  mode system_mode NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by TEXT NOT NULL,
  previous_mode system_mode
);

-- Seed the control table with initial SAFE mode
INSERT INTO system_control (id, mode, updated_by) 
VALUES (1, 'SAFE', 'system')
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for system_control
ALTER TABLE system_control ENABLE ROW LEVEL SECURITY;

-- Anyone can read the current mode (public access required for middleware)
CREATE POLICY "Public read access to system mode"
  ON system_control
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Only service role can update (admin updates via service role client)
-- No user-level update policy - controlled server-side via ADMIN_EMAILS
CREATE POLICY "Service role only updates"
  ON system_control
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for system_control_history
ALTER TABLE system_control_history ENABLE ROW LEVEL SECURITY;

-- Anyone can read history (for transparency)
CREATE POLICY "Public read access to history"
  ON system_control_history
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Only service role can insert (via trigger)
CREATE POLICY "Service role only inserts history"
  ON system_control_history
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Trigger to auto-log changes to history table
CREATE OR REPLACE FUNCTION log_system_control_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO system_control_history (mode, changed_by, previous_mode)
  VALUES (NEW.mode, NEW.updated_by, OLD.mode);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER system_control_audit_trigger
  AFTER UPDATE ON system_control
  FOR EACH ROW
  EXECUTE FUNCTION log_system_control_change();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_history_changed_at ON system_control_history(changed_at DESC);

-- Grant permissions
GRANT SELECT ON system_control TO anon, authenticated;
GRANT SELECT ON system_control_history TO anon, authenticated;
GRANT ALL ON system_control TO service_role;
GRANT ALL ON system_control_history TO service_role;
GRANT USAGE ON SEQUENCE system_control_history_id_seq TO service_role;
