-- Enable RLS on gyontato_proactive_messages
alter table public.gyontato_proactive_messages enable row level security;

-- Service role (backend) can do everything
create policy "service role full access"
  on public.gyontato_proactive_messages
  as permissive
  for all
  to service_role
  using (true)
  with check (true);

-- Authenticated users can only read their own conversation's proactive entries
create policy "users read own proactive messages"
  on public.gyontato_proactive_messages
  as permissive
  for select
  to authenticated
  using (
    conversation_id in (
      select id from public.gyontato_conversations
      where user_id = auth.uid()
    )
  );
