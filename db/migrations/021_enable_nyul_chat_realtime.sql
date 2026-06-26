-- Ensure Nyul chat messages are included in Supabase Realtime publication.
-- Without this, postgres_changes subscribers will not receive INSERT events.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'nyul_chat_messages'
    ) then
      execute 'alter publication supabase_realtime add table public.nyul_chat_messages';
    end if;
  end if;
end $$;
