alter table if exists gyontato_conversations
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists gyontato_conversations_metadata_gin_idx
  on gyontato_conversations
  using gin (metadata);
