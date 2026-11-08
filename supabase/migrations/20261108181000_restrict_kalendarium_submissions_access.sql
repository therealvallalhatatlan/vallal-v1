-- The submission table is accessed only through the authenticated server API.
-- Keep RLS enabled and remove default direct Data API grants from browser roles.
revoke all on table public.kalendarium_submissions from public, anon, authenticated;
grant select, insert, update, delete on table public.kalendarium_submissions to service_role;
