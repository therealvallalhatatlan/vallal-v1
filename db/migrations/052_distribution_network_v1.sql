-- Distribution Network v1
-- Centralized customer payment + local distribution cells + inventory-backed offers.
-- Applied to production DB during implementation; kept here as the reproducible schema.

create table if not exists public.distribution_cells (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  city text not null,
  country_code text not null default 'HU',
  status text not null default 'active' check (status in ('active','paused','inactive')),
  stripe_connected_account_id text,
  stripe_payouts_enabled boolean not null default false,
  commission_default_huf integer not null default 0 check (commission_default_huf >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.distribution_cell_members (
  cell_id uuid not null references public.distribution_cells(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  created_at timestamptz not null default now(),
  primary key (cell_id, user_id)
);

create table if not exists public.distribution_cell_inventory (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.distribution_cells(id) on delete cascade,
  product_id text not null,
  product_name text not null,
  unit_price_huf integer not null check (unit_price_huf > 0),
  quantity_total integer not null default 0 check (quantity_total >= 0),
  quantity_available integer not null default 0
    check (quantity_available >= 0 and quantity_available <= quantity_total),
  updated_at timestamptz not null default now(),
  unique(cell_id, product_id)
);

create table if not exists public.distribution_inventory_events (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.distribution_cells(id) on delete cascade,
  product_id text not null,
  delta_quantity integer not null check (delta_quantity <> 0),
  event_type text not null check (
    event_type in ('starter_allocation','manual_adjustment','drop_allocated','drop_released','return')
  ),
  reference_id uuid,
  created_by_user_id uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.distribution_drops (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.distribution_cells(id) on delete restrict,
  product_id text not null default 'book_ii',
  product_name text not null default 'Vállalhatatlan II.',
  price_huf integer not null default 15000 check (price_huf > 0),
  city text not null,
  district text,
  location_hint text not null,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  fulfillment_options text[] not null default array['dead_drop']::text[],
  status text not null default 'active'
    check (status in ('active','reserved','purchased','collected','cancelled','expired')),
  hidden_at timestamptz not null default now(),
  reserved_by_user_id uuid references auth.users(id) on delete set null,
  reserved_until timestamptz,
  reserved_fulfillment_method text,
  order_id uuid,
  buyer_user_id uuid references auth.users(id) on delete set null,
  found_at timestamptz,
  found_by_user_id uuid references auth.users(id) on delete set null,
  found_message text,
  found_photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_distribution_drops_order_id
  on public.distribution_drops(order_id) where order_id is not null;
create index if not exists idx_distribution_drops_active_sort
  on public.distribution_drops(status, hidden_at asc);
create index if not exists idx_distribution_drops_city_status
  on public.distribution_drops(city, status);
create index if not exists idx_distribution_drops_cell
  on public.distribution_drops(cell_id);

create table if not exists public.distribution_commissions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  cell_id uuid not null references public.distribution_cells(id) on delete restrict,
  amount_huf integer not null default 0 check (amount_huf >= 0),
  status text not null default 'pending'
    check (status in ('pending','approved','transferred','reversed','blocked')),
  stripe_transfer_id text,
  approved_at timestamptz,
  transferred_at timestamptz,
  reversed_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(order_id)
);

alter table public.orders
  add column if not exists distribution_drop_id uuid references public.distribution_drops(id) on delete set null;
alter table public.orders
  add column if not exists distribution_cell_id uuid references public.distribution_cells(id) on delete set null;
alter table public.orders
  add column if not exists distribution_fulfillment_method text;
alter table public.orders
  add column if not exists distribution_commission_huf integer not null default 0;
alter table public.orders
  add column if not exists distribution_product_name text;

alter table public.orders drop constraint if exists orders_delivery_type_check;
alter table public.orders add constraint orders_delivery_type_check
  check (delivery_type = any (array[
    'dead_drop','anonymous_locker','personal','hu_shipping','eu_shipping','global_shipping'
  ]::text[]));

alter table public.distribution_cells enable row level security;
alter table public.distribution_cell_members enable row level security;
alter table public.distribution_cell_inventory enable row level security;
alter table public.distribution_inventory_events enable row level security;
alter table public.distribution_drops enable row level security;
alter table public.distribution_commissions enable row level security;

revoke all on public.distribution_cells from anon, authenticated;
revoke all on public.distribution_cell_members from anon, authenticated;
revoke all on public.distribution_cell_inventory from anon, authenticated;
revoke all on public.distribution_inventory_events from anon, authenticated;
revoke all on public.distribution_drops from anon, authenticated;
revoke all on public.distribution_commissions from anon, authenticated;

grant all on public.distribution_cells to service_role;
grant all on public.distribution_cell_members to service_role;
grant all on public.distribution_cell_inventory to service_role;
grant all on public.distribution_inventory_events to service_role;
grant all on public.distribution_drops to service_role;
grant all on public.distribution_commissions to service_role;
