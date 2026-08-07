create table if not exists pm_unread_counts (
  user_id uuid not null references auth.users (id) on delete cascade,
  other_user_id uuid not null references auth.users (id) on delete cascade,
  unread_count integer not null default 0 check (unread_count >= 0),
  last_message_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, other_user_id),
  constraint pm_unread_counts_distinct_users check (user_id <> other_user_id)
);

create index if not exists pm_unread_counts_user_idx
  on pm_unread_counts (user_id, last_message_at desc);

alter table pm_unread_counts enable row level security;

create policy pm_unread_counts_service_role_all on pm_unread_counts
  for all
  using (auth.role() = 'service_role')
  with check (true);

create policy pm_unread_counts_user_select on pm_unread_counts
  for select
  using (auth.uid() = user_id);

create policy pm_unread_counts_user_update on pm_unread_counts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function set_pm_unread_counts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger pm_unread_counts_updated_at
before update on pm_unread_counts
for each row execute procedure set_pm_unread_counts_updated_at();

create or replace function increment_pm_unread(
  p_recipient_user_id uuid,
  p_other_user_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_count integer;
begin
  insert into pm_unread_counts (user_id, other_user_id, unread_count, last_message_at)
  values (p_recipient_user_id, p_other_user_id, 1, now())
  on conflict (user_id, other_user_id)
  do update
    set unread_count = pm_unread_counts.unread_count + 1,
        last_message_at = now()
  returning unread_count into next_count;

  return coalesce(next_count, 1);
end;
$$;

grant execute on function increment_pm_unread(uuid, uuid) to service_role;