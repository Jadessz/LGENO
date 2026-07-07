-- Track API cost per search and email on leads

alter table searches
  add column if not exists text_search_pages integer,
  add column if not exists place_details_calls integer,
  add column if not exists estimated_cost_usd numeric(10, 4);

alter table leads
  add column if not exists email text;
