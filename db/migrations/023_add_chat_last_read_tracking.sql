-- Add read-tracking for Nyul chat notifications.

alter table nyul_chat_participants
  add column if not exists last_read_at timestamptz;

update nyul_chat_participants
set last_read_at = coalesce(last_read_at, joined_at)
where last_read_at is null;

alter table nyul_chat_participants
  alter column last_read_at set default now();

drop policy if exists nyul_public_update_chat_participants on nyul_chat_participants;

create policy nyul_public_update_chat_participants
on nyul_chat_participants
for update
using (true)
with check (true);
