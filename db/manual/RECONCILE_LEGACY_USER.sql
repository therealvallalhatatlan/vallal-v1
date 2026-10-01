-- Manual legacy user reconciliation
-- Run ONLY after you have confirmed both IDs belong to the same person.
--
-- Example:
-- SELECT public.reconcile_legacy_user(
--   'LEGACY_PUBLIC_USERS_ID'::uuid,
--   'CURRENT_AUTH_USER_ID'::uuid,
--   'Confirmed by owner: old email / historical purchase records'
-- );
--
-- First inspect candidates:
SELECT
  pu.id AS legacy_user_id,
  pu.email AS legacy_email,
  pu.nickname,
  au.id AS canonical_auth_user_id,
  au.email AS canonical_auth_email
FROM public.users pu
LEFT JOIN auth.users au
  ON lower(trim(au.email)) = lower(trim(pu.email))
WHERE pu.id <> COALESCE(au.id, '00000000-0000-0000-0000-000000000000'::uuid)
ORDER BY pu.created_at;

-- Then, after manual confirmation, run ONE explicit reconciliation:
--
-- SELECT public.reconcile_legacy_user(
--   '36d0c754-410d-4cc6-882a-9aca304cac18'::uuid,
--   'NEW_AUTH_USER_UUID'::uuid,
--   'Confirmed identity: gykoles@gmail.com legacy profile'
-- );
