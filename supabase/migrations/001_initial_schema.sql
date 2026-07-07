-- Lead Generator schema

create table if not exists searches (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  location text not null,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  total_found integer not null default 0,
  leads_found integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  place_id text not null unique,
  name text not null,
  address text not null default '',
  phone text,
  rating numeric,
  rating_count integer,
  business_status text,
  has_website boolean not null default false,
  search_id uuid references searches(id) on delete set null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists leads_search_id_idx on leads(search_id);
create index if not exists leads_last_seen_at_idx on leads(last_seen_at desc);

create table if not exists saved_locations (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  category text not null,
  location text not null,
  is_default boolean not null default false,
  schedule_enabled boolean not null default false,
  schedule_cron text,
  max_pages integer not null default 3,
  created_at timestamptz not null default now()
);

create index if not exists saved_locations_default_idx on saved_locations(is_default) where is_default = true;
