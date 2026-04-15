alter table if exists gyontato_conversations
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists user_email text;

create index if not exists gyontato_conversations_user_id_idx
  on gyontato_conversations(user_id);

create unique index if not exists gyontato_conversations_user_id_unique_idx
  on gyontato_conversations(user_id)
  where user_id is not null;
