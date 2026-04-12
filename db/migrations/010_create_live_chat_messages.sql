create extension if not exists "pgcrypto";

create table if not exists live_chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id text not null default 'nyitott-muhely',
  display_name text not null,
  sender_role text not null check (sender_role in ('viewer', 'broadcaster')),
  body text not null check (char_length(body) between 1 and 200),
  created_at timestamptz not null default now()
);

create index if not exists live_chat_messages_room_created_idx
  on live_chat_messages (room_id, created_at desc);

alter table live_chat_messages enable row level security;

create policy live_chat_messages_service_role_all on live_chat_messages
  for all using (auth.role() = 'service_role') with check (true);

create policy live_chat_messages_public_select on live_chat_messages
  for select using (true);