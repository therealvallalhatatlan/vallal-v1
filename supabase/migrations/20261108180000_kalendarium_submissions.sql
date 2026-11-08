-- Vállalhatatlan Kalendárium 2027 submissions
-- Run in Supabase SQL Editor before enabling live submissions.

create table if not exists public.kalendarium_submissions (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('art','service','both')),
  author_name text not null,
  contact_email text not null,
  bio text not null default '',
  note text not null default '',
  artworks jsonb not null default '[]'::jsonb,
  service_listing jsonb,
  status text not null default 'new' check (status in ('new','screening','selected','needs_revision','rejected','layout','published')),
  payment_status text not null default 'not_applicable' check (payment_status in ('not_applicable','not_requested','awaiting_payment','paid','refunded')),
  consent_data_at timestamptz not null,
  consent_rights boolean not null default false,
  consent_publication boolean not null default false,
  consent_crew boolean not null default false,
  editor_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kalendarium_submissions_user_created_idx on public.kalendarium_submissions(user_id, created_at desc);
create index if not exists kalendarium_submissions_status_created_idx on public.kalendarium_submissions(status, created_at desc);

alter table public.kalendarium_submissions enable row level security;
-- The authenticated server API uses the service role; never grant direct browser access.
grant select, insert, update, delete on table public.kalendarium_submissions to service_role;
-- No anon/authenticated policies or direct browser write access.

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('kalendarium-2027','kalendarium-2027',false,15728640,array[
  'image/jpeg','image/png','image/webp','application/pdf','application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain'
])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
