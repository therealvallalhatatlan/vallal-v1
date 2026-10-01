-- Auditable manual badge overrides for historical / exceptional users.
-- Computed badges remain the default source of truth.
-- An override is an explicit, reversible exception with a reason.

CREATE TABLE IF NOT EXISTS public.user_badge_overrides (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badge_overrides_user_id
  ON public.user_badge_overrides(user_id);

ALTER TABLE public.user_badge_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_badge_overrides_service_role_all
  ON public.user_badge_overrides;

CREATE POLICY user_badge_overrides_service_role_all
  ON public.user_badge_overrides
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
