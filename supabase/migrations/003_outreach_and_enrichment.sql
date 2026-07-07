-- Outreach workflow + Places enrichment fields

alter table leads
  add column if not exists outreach_status text not null default 'new'
    check (outreach_status in ('new', 'contacted', 'interested', 'won', 'lost')),
  add column if not exists notes text,
  add column if not exists google_maps_uri text,
  add column if not exists primary_type text;

alter table saved_locations
  add column if not exists max_results integer not null default 60,
  add column if not exists budget_cap_usd numeric(10, 4);

create index if not exists leads_outreach_status_idx on leads(outreach_status);
