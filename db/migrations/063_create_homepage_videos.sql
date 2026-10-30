-- Public video carousel for the signed-out homepage.
-- Media files live outside the Git repository; this table stores metadata and URLs.

create table if not exists public.homepage_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  video_url text not null,
  poster_url text,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint homepage_videos_video_url_key unique (video_url)
);

alter table public.homepage_videos enable row level security;

revoke all on table public.homepage_videos from anon, authenticated;
grant select on table public.homepage_videos to anon, authenticated;
grant all on table public.homepage_videos to service_role;

drop policy if exists "Public can read published homepage videos" on public.homepage_videos;
create policy "Public can read published homepage videos"
  on public.homepage_videos
  for select
  to anon, authenticated
  using (is_published = true);

create index if not exists homepage_videos_published_order_idx
  on public.homepage_videos (sort_order asc, published_at desc)
  where is_published = true;

insert into public.homepage_videos (
  title,
  video_url,
  sort_order,
  is_published,
  published_at
)
values (
  'NYITÓFILM',
  '/videos/dd2.mp4',
  0,
  true,
  now()
)
on conflict (video_url) do nothing;
