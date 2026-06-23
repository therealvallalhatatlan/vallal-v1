create extension if not exists "pgcrypto";

create table if not exists nyul_identities (
  id uuid primary key default gen_random_uuid(),
  identity_token uuid not null unique,
  public_id text not null unique,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  constraint nyul_public_id_length check (char_length(public_id) between 4 and 12)
);

create table if not exists nyul_ticker_messages (
  id uuid primary key default gen_random_uuid(),
  body text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create table if not exists nyul_rabbit_posts (
  id uuid primary key default gen_random_uuid(),
  identity_token uuid not null references nyul_identities(identity_token) on delete cascade,
  public_id text,
  message text not null check (char_length(message) between 1 and 500),
  status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists nyul_feed_entries (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('story', 'secret', 'admin_note')),
  body text not null,
  status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists nyul_chat_threads (
  id uuid primary key default gen_random_uuid(),
  state text not null default 'open' check (state in ('open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists nyul_chat_participants (
  thread_id uuid not null references nyul_chat_threads(id) on delete cascade,
  identity_token uuid not null references nyul_identities(identity_token) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (thread_id, identity_token)
);

create table if not exists nyul_chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references nyul_chat_threads(id) on delete cascade,
  sender_identity_token uuid not null references nyul_identities(identity_token) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table if not exists nyul_user_blocks (
  id uuid primary key default gen_random_uuid(),
  identity_token uuid not null references nyul_identities(identity_token) on delete cascade,
  blocked_identity_token uuid not null references nyul_identities(identity_token) on delete cascade,
  created_at timestamptz not null default now(),
  unique (identity_token, blocked_identity_token)
);

create table if not exists nyul_user_reports (
  id uuid primary key default gen_random_uuid(),
  identity_token uuid not null references nyul_identities(identity_token) on delete cascade,
  target_identity_token uuid references nyul_identities(identity_token) on delete set null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists nyul_match_pool (
  identity_token uuid primary key references nyul_identities(identity_token) on delete cascade,
  active boolean not null default true,
  entered_at timestamptz not null default now()
);

create table if not exists nyul_matches (
  id uuid primary key default gen_random_uuid(),
  identity_a uuid not null references nyul_identities(identity_token) on delete cascade,
  identity_b uuid not null references nyul_identities(identity_token) on delete cascade,
  location_text text not null,
  icebreaker_text text not null,
  state text not null default 'active' check (state in ('active', 'expired')),
  created_at timestamptz not null default now()
);

create table if not exists nyul_feature_progress (
  identity_token uuid not null references nyul_identities(identity_token) on delete cascade,
  feature_key text not null check (feature_key in ('rabbit-network', 'person-finder', 'fourth-volume', 'meet-someone')),
  completed_at timestamptz not null default now(),
  primary key (identity_token, feature_key)
);

create table if not exists nyul_reward_claims (
  id uuid primary key default gen_random_uuid(),
  identity_token uuid not null unique references nyul_identities(identity_token) on delete cascade,
  reward_code text not null,
  claimed_at timestamptz not null default now()
);

create index if not exists nyul_rabbit_posts_created_idx on nyul_rabbit_posts (created_at desc);
create index if not exists nyul_feed_entries_created_idx on nyul_feed_entries (created_at desc);
create index if not exists nyul_chat_messages_thread_created_idx on nyul_chat_messages (thread_id, created_at desc);
create index if not exists nyul_match_pool_active_entered_idx on nyul_match_pool (active, entered_at asc);

create or replace function nyul_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tr_nyul_identities_updated_at on nyul_identities;
create trigger tr_nyul_identities_updated_at
  before update on nyul_identities
  for each row execute function nyul_set_updated_at();

drop trigger if exists tr_nyul_chat_threads_updated_at on nyul_chat_threads;
create trigger tr_nyul_chat_threads_updated_at
  before update on nyul_chat_threads
  for each row execute function nyul_set_updated_at();

create or replace function nyul_start_chat(
  p_identity_token uuid,
  p_target_public_id text
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_target_token uuid;
  v_thread_id uuid;
begin
  select identity_token
  into v_target_token
  from nyul_identities
  where public_id = upper(trim(p_target_public_id))
  limit 1;

  if v_target_token is null then
    return null;
  end if;

  select cp.thread_id
  into v_thread_id
  from nyul_chat_participants cp
  join nyul_chat_participants cp2 on cp2.thread_id = cp.thread_id
  where cp.identity_token = p_identity_token
    and cp2.identity_token = v_target_token
  limit 1;

  if v_thread_id is null then
    insert into nyul_chat_threads default values returning id into v_thread_id;
    insert into nyul_chat_participants(thread_id, identity_token)
    values (v_thread_id, p_identity_token), (v_thread_id, v_target_token)
    on conflict do nothing;
  end if;

  return v_thread_id;
end;
$$;

create or replace function nyul_join_pool(p_identity_token uuid)
returns table(match_id uuid, location_text text, icebreaker_text text, state text)
language plpgsql
security definer
as $$
declare
  v_other uuid;
  v_match_id uuid;
  v_location text;
  v_icebreaker text;
begin
  insert into nyul_match_pool(identity_token, active, entered_at)
  values (p_identity_token, true, now())
  on conflict (identity_token)
  do update set active = true, entered_at = excluded.entered_at;

  select identity_token
  into v_other
  from nyul_match_pool
  where active = true and identity_token <> p_identity_token
  order by entered_at asc
  limit 1
  for update skip locked;

  if v_other is null then
    return;
  end if;

  v_location := (array['DJ pult jobb oldala', 'Neon oszlop', 'Bejarat melletti pad', 'Bar pult bal sarok'])[(random() * 3)::int + 1];
  v_icebreaker := (array['Mi volt az elso rave elmenyed?', 'Melyik novella talalt el?', 'Melyik szamra tancolnal most?', 'Milyen titkot hoztal ma?'])[(random() * 3)::int + 1];

  insert into nyul_matches(identity_a, identity_b, location_text, icebreaker_text)
  values (p_identity_token, v_other, v_location, v_icebreaker)
  returning id into v_match_id;

  update nyul_match_pool set active = false where identity_token in (p_identity_token, v_other);

  return query
  select v_match_id, v_location, v_icebreaker, 'matched'::text;
end;
$$;

alter table nyul_identities enable row level security;
alter table nyul_ticker_messages enable row level security;
alter table nyul_rabbit_posts enable row level security;
alter table nyul_feed_entries enable row level security;
alter table nyul_chat_threads enable row level security;
alter table nyul_chat_participants enable row level security;
alter table nyul_chat_messages enable row level security;
alter table nyul_user_blocks enable row level security;
alter table nyul_user_reports enable row level security;
alter table nyul_match_pool enable row level security;
alter table nyul_matches enable row level security;
alter table nyul_feature_progress enable row level security;
alter table nyul_reward_claims enable row level security;

create policy nyul_service_all_identities on nyul_identities for all using (auth.role() = 'service_role') with check (true);
create policy nyul_service_all_ticker on nyul_ticker_messages for all using (auth.role() = 'service_role') with check (true);
create policy nyul_service_all_rabbit on nyul_rabbit_posts for all using (auth.role() = 'service_role') with check (true);
create policy nyul_service_all_feed on nyul_feed_entries for all using (auth.role() = 'service_role') with check (true);
create policy nyul_service_all_threads on nyul_chat_threads for all using (auth.role() = 'service_role') with check (true);
create policy nyul_service_all_participants on nyul_chat_participants for all using (auth.role() = 'service_role') with check (true);
create policy nyul_service_all_messages on nyul_chat_messages for all using (auth.role() = 'service_role') with check (true);
create policy nyul_service_all_blocks on nyul_user_blocks for all using (auth.role() = 'service_role') with check (true);
create policy nyul_service_all_reports on nyul_user_reports for all using (auth.role() = 'service_role') with check (true);
create policy nyul_service_all_pool on nyul_match_pool for all using (auth.role() = 'service_role') with check (true);
create policy nyul_service_all_matches on nyul_matches for all using (auth.role() = 'service_role') with check (true);
create policy nyul_service_all_progress on nyul_feature_progress for all using (auth.role() = 'service_role') with check (true);
create policy nyul_service_all_reward on nyul_reward_claims for all using (auth.role() = 'service_role') with check (true);

create policy nyul_public_read_ticker on nyul_ticker_messages for select using (true);
create policy nyul_public_read_feed on nyul_feed_entries for select using (status = 'approved');
create policy nyul_public_read_rabbit on nyul_rabbit_posts for select using (status = 'approved');
create policy nyul_public_read_identities on nyul_identities for select using (is_active = true);
create policy nyul_public_read_participants on nyul_chat_participants for select using (true);
create policy nyul_public_read_chat_messages on nyul_chat_messages for select using (true);
create policy nyul_public_read_chat_threads on nyul_chat_threads for select using (true);
create policy nyul_public_read_matches on nyul_matches for select using (true);

create policy nyul_public_insert_identities on nyul_identities for insert with check (true);
create policy nyul_public_update_identities on nyul_identities for update using (true) with check (true);
create policy nyul_public_insert_rabbit on nyul_rabbit_posts for insert with check (true);
create policy nyul_public_insert_reports on nyul_user_reports for insert with check (true);
create policy nyul_public_insert_blocks on nyul_user_blocks for insert with check (true);
create policy nyul_public_insert_progress on nyul_feature_progress for insert with check (true);
create policy nyul_public_update_progress on nyul_feature_progress for update using (true) with check (true);
create policy nyul_public_insert_pool on nyul_match_pool for insert with check (true);
create policy nyul_public_update_pool on nyul_match_pool for update using (true) with check (true);
create policy nyul_public_insert_chat_messages on nyul_chat_messages for insert with check (true);
create policy nyul_public_insert_chat_participants on nyul_chat_participants for insert with check (true);
create policy nyul_public_insert_chat_threads on nyul_chat_threads for insert with check (true);
