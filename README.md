# LGENO

Find local businesses on Google Maps that have no website. Uses [Places API (New)](https://developers.google.com/maps/documentation/places/web-service/overview) — no scraping.

React dashboard + serverless API + Supabase. Track leads, export CSV, save search presets, optional cron for scheduled runs.

## Setup

**Google Cloud** — billing on, enable Places API (New), create an API key restricted to that API.

**Supabase** — run migrations in order:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_stats_and_email.sql
supabase/migrations/003_outreach_and_enrichment.sql
```

```bash
cp .env.example .env.local
```

| Variable | Notes |
|----------|-------|
| `GOOGLE_PLACES_API_KEY` | server only |
| `SUPABASE_URL` | |
| `SUPABASE_SERVICE_KEY` | service role, server only |
| `CRON_SECRET` | for `/api/cron/run` |
| `APP_API_KEY` / `VITE_APP_API_KEY` | optional, protects writes |
| `API_PORT` | default `3001` |

## Development

```bash
npm install
npm run dev:api   # terminal 1
npm run dev       # terminal 2 → http://localhost:5173
```

Vite proxies `/api` to the local API server.

```bash
npm run build
npm run lint
npm run search -- --category restaurants --location "London, UK" --export-csv
```

## How it works

Text Search → Place Details for each result → keep operational businesses with no `websiteUri` → upsert to Supabase.

You're billed per business **scanned**, not per lead found. Rough costs: ~$0.032/page of Text Search, ~$0.02/Place Details call. A 3-page search checking 60 places is about $1.30 whether you get 2 leads or 20.

Optional filters: require phone, min rating, min review count. Google doesn't return email — the column exists in the schema but stays empty.

## Coming updates

**Outreach** — contact enrichment, re-scan leads for new websites, cross-search dedup

**Search** — persist quality filters in presets/cron, configurable schedule, background jobs for long runs

**Dashboard** — map view, bulk status/export, trend charts, pagination

**Platform** — user auth, tests, shared rate limiting across instances

## License

Copyright © 2026 Jadessz. Copy and modify for your own use. Don't redistribute as your own product or strip attribution. See [LICENSE](LICENSE).
