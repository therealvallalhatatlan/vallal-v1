-- Inbox schema: conversations + messages with user/admin roles
create extension if not exists "uuid-ossp";

create table if not exists conversations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  last_admin_read_at timestamptz,
  last_user_read_at timestamptz
);

create unique index if not exists conversations_user_unique_idx on conversations(user_id);
create index if not exists conversations_user_id_idx on conversations(user_id);
create index if not exists conversations_last_message_at_idx on conversations(last_message_at desc);

create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_role text not null check (sender_role in ('user','admin')),
  user_id uuid references auth.users(id) on delete set null,
  body text not null check (char_length(body) <= 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists messages_conversation_id_idx on messages(conversation_id, created_at desc);
create index if not exists messages_user_id_idx on messages(user_id);

-- When a message is inserted, bump conversation last_message_at
create or replace function set_conversation_last_message()
returns trigger language plpgsql as $$
begin
  update conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

create trigger tr_set_conversation_last_message
  after insert on messages
  for each row execute function set_conversation_last_message();

-- RLS
alter table conversations enable row level security;
alter table messages enable row level security;

-- Service role: full access (admin server-side)
create policy conversations_service_role_all on conversations
  for all using (auth.role() = 'service_role') with check (true);

create policy messages_service_role_all on messages
  for all using (auth.role() = 'service_role') with check (true);

-- Users: only their own conversation
create policy conversations_user_select on conversations
  for select using (auth.role() = 'authenticated' and user_id = auth.uid());

create policy conversations_user_insert on conversations
  for insert with check (auth.role() = 'authenticated' and user_id = auth.uid());

create policy conversations_user_update on conversations
  for update using (auth.role() = 'authenticated' and user_id = auth.uid());

-- Messages policies (no delete)
create policy messages_user_select on messages
  for select using (
    auth.role() = 'authenticated'
    and conversation_id in (
      select id from conversations where user_id = auth.uid()
    )
  );

create policy messages_user_insert on messages
  for insert with check (
    auth.role() = 'authenticated'
    and conversation_id in (select id from conversations where user_id = auth.uid())
    and (sender_role = 'user')
    and (user_id is null or user_id = auth.uid())
  );

create policy messages_user_update on messages
  for update using (
    auth.role() = 'authenticated'
    and conversation_id in (select id from conversations where user_id = auth.uid())
  )
  with check (
    auth.role() = 'authenticated'
    and conversation_id in (select id from conversations where user_id = auth.uid())
  );
