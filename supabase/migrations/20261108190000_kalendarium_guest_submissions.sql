-- Allow Kalendarium entries from visitors without a Vállalhatatlan account.
-- Existing authenticated submissions remain linked; deleting an account no longer
-- deletes the editorial submission itself.

alter table public.kalendarium_submissions
  alter column user_id drop not null;

alter table public.kalendarium_submissions
  drop constraint if exists kalendarium_submissions_user_id_fkey;

alter table public.kalendarium_submissions
  add constraint kalendarium_submissions_user_id_fkey
  foreign key (user_id)
  references auth.users(id)
  on delete set null;
