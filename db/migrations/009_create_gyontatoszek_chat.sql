create extension if not exists "uuid-ossp";

create table if not exists gyontato_conversations (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create index if not exists gyontato_conversations_session_id_idx
  on gyontato_conversations(session_id);

create index if not exists gyontato_conversations_last_message_at_idx
  on gyontato_conversations(last_message_at desc);

create table if not exists gyontato_messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references gyontato_conversations(id) on delete cascade,
  sender_role text not null check (sender_role in ('user', 'assistant')),
  body text not null check (char_length(body) <= 4000),
  model text,
  safety_flag boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists gyontato_messages_conversation_id_idx
  on gyontato_messages(conversation_id, created_at desc);

create or replace function set_gyontato_conversation_message_timestamps()
returns trigger language plpgsql as $$
begin
  update gyontato_conversations
  set last_message_at = new.created_at,
      updated_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists tr_set_gyontato_conversation_message_timestamps on gyontato_messages;

create trigger tr_set_gyontato_conversation_message_timestamps
  after insert on gyontato_messages
  for each row execute function set_gyontato_conversation_message_timestamps();

alter table gyontato_conversations enable row level security;
alter table gyontato_messages enable row level security;

create policy gyontato_conversations_service_role_all on gyontato_conversations
  for all using (auth.role() = 'service_role') with check (true);

create policy gyontato_messages_service_role_all on gyontato_messages
  for all using (auth.role() = 'service_role') with check (true);