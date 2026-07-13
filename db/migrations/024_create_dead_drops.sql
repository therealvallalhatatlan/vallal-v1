-- Create drops table for public dead-drop feed and anonymous proof-of-find claims.

create table if not exists public.drops (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'active' check (status in ('active', 'claimed')),
  title text not null check (char_length(title) >= 1 and char_length(title) <= 160),
  location_hint text not null check (char_length(location_hint) >= 1 and char_length(location_hint) <= 500),
  coordinates jsonb,
  anonymous_finder_alias text check (
    anonymous_finder_alias is null
    or char_length(anonymous_finder_alias) between 3 and 40
  ),
  proof_image_url text,
  proof_note text check (
    proof_note is null
    or char_length(proof_note) <= 500
  ),
  storage_path text,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint drops_claimed_requires_proof check (
    status <> 'claimed'
    or (
      anonymous_finder_alias is not null
      and proof_image_url is not null
      and claimed_at is not null
    )
  ),
  constraint drops_coordinates_shape check (
    coordinates is null
    or jsonb_typeof(coordinates) = 'object'
  )
);

create index if not exists idx_drops_status on public.drops(status);
create index if not exists idx_drops_created_at_desc on public.drops(created_at desc);
create index if not exists idx_drops_claimed_at_desc on public.drops(claimed_at desc nulls last);

create or replace function public.set_drops_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_drops_updated_at on public.drops;
create trigger set_drops_updated_at
before update on public.drops
for each row
execute function public.set_drops_updated_at();

alter table public.drops enable row level security;

drop policy if exists "Anyone can read drops" on public.drops;
create policy "Anyone can read drops"
  on public.drops
  for select
  using (true);

do $$
begin
  if not exists (
    select 1
    from storage.buckets
    where id = 'dead-drop-proofs'
  ) then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'dead-drop-proofs',
      'dead-drop-proofs',
      true,
      4194304,
      array['image/jpeg', 'image/png', 'image/webp']
    );
  end if;
end $$;

drop policy if exists "Public can upload dead drop proofs" on storage.objects;
create policy "Public can upload dead drop proofs"
  on storage.objects
  for insert
  to public
  with check (
    bucket_id = 'dead-drop-proofs'
    and (storage.foldername(name))[1] = 'dead-drops'
  );

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'drops'
    ) then
      execute 'alter publication supabase_realtime add table public.drops';
    end if;
  end if;
end $$;