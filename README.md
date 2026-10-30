# Hissa

A portion coach for desi households: photograph the meal, get a plan in roti, katori and plate that fits what is left of today's budget. All numbers are estimates.

- [docs/PRD.md](docs/PRD.md) product summary
- [docs/architecture.md](docs/architecture.md) module and layer rules
- [AGENTS.md](AGENTS.md) rules for coding agents

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

`npm run dev | build | test | lint` (the last three run in every workspace).

## Database

`database/supabase/` is a Supabase CLI project. From `database/`: `npx supabase start`, then `npx supabase db reset` applies the migration and `seed.sql` (needs Docker).
