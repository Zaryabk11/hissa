# Hissa

A portion coach for desi households: photograph the meal, get a plan in roti, katori and plate that fits what is left of today's budget. All numbers are estimates.

- [docs/PRD.md](docs/PRD.md) product summary
- [docs/architecture.md](docs/architecture.md) module and layer rules
- [AGENTS.md](AGENTS.md) rules for coding agents

## Status

v1 (Portion Coach: photo, Gemini names dishes, confirm, portion plan, saved meal, today's log) is done on the backend and database. The Expo app is not part of v1. Next: v2 Duo Streaks, then v3 Food and Feel.

- [docs/PRD.md](docs/PRD.md) module status
- [backend/README.md](backend/README.md) API contract and run steps
- [Roadmap](docs/superpowers/plans/2026-11-01-roadmap-v1-v2-v3.md) and the [v1 plan](docs/superpowers/plans/2026-11-01-v1-portion-coach.md)

## Setup

Needs Node 20+.

```
npm install
cp backend/.env.example backend/.env       # fill in the values
cp frontend/.env.example frontend/.env
npm run dev          # API on :3000
npm run dev:app      # Expo
```

Check the API: `curl http://localhost:3000/api/health` returns `{"status":"ok"}`.

## Scripts

`npm run dev | build | test | lint` (the last three run in every workspace). `npm run test:data` checks the dish catalog and seed builder.

## Database

`database/supabase/` is a Supabase CLI project. From `database/`: `npx supabase start`, then `npx supabase db reset` applies the migrations and `seed.sql` (needs Docker). `seed.sql` is generated from `database/data/catalog.csv`; see [docs/data-sources.md](docs/data-sources.md). Hosted setup is in [backend/README.md](backend/README.md).
