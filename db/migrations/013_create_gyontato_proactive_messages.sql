create table if not exists public.gyontato_proactive_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.gyontato_conversations(id) on delete cascade,
  trigger_type text not null,
  reason text,
  score numeric(5,4) not null default 0,
  body_preview text,
  status text not null default 'queued' check (status in ('queued', 'sent', 'skipped')),
  sent_as_message_id uuid null,
  created_at timestamptz not null default now()
);

create index if not exists gyontato_proactive_messages_conversation_idx
  on public.gyontato_proactive_messages (conversation_id, created_at desc);

create index if not exists gyontato_proactive_messages_status_idx
  on public.gyontato_proactive_messages (status, created_at desc);
