# Hissa

A portion coach for desi households: photograph the meal, get a plan in roti, katori and plate that fits what is left of today's budget. All numbers are estimates.

- [docs/PRD.md](docs/PRD.md) product summary
- [docs/architecture.md](docs/architecture.md) module and layer rules
- [AGENTS.md](AGENTS.md) rules for coding agents

## Status

Updated 2026-11-04. **Start with [docs/superpowers/plans/2026-11-02-v2-status.md](docs/superpowers/plans/2026-11-02-v2-status.md)**: it is the live status, the task board and the handoff.

- **Built:** the v1 portion coach (scan, plan, saved meals, today's log), Google sign-in, friends, goals and an in-app notification inbox (usernames, streaks, nudges, cheers) and the Food and Feel check-in, with a per-user evidence model and a synthetic-data question ranker behind it. The Expo app (landing, onboarding, Today, Scan, plan, Social, Food and Feel) is connected to the API.
- **v3 (2026-11-04, on main, not run on a phone):** avoid list (onboarding and Profile), dish protein types, ranked recipes with one-tap "not for me", scan "You avoid this" flag, Today "Recipes for you". Recipes are served only after a human marks them reviewed; none is yet. The v3 migration is not applied to any database.
- **Held by the user:** API deployment (Railway) and the evaluator Android build. Nothing is deployed.
- **Not verified:** a full Google sign-in plus scan flow on a physical phone, and anything on Android.

Docs: [PRD](docs/PRD.md), [architecture](docs/architecture.md), [backend API contract](backend/README.md), [decisions](docs/decisions/), [roadmap](docs/superpowers/plans/2026-11-01-roadmap-v1-v2-v3.md).

## Setup

Needs Node 22.13 or newer (Node 24.3+ recommended; Node 25 is not supported by Vitest). Developed on Node 24.

```
npm install
cp backend/.env.example backend/.env       # fill in the values
cp frontend/.env.example frontend/.env     # EXPO_PUBLIC_* only, never a secret
npm run dev          # API on :3000
npm run dev:app      # Expo (see below)
```

Check the API: `curl http://localhost:3000/api/health` returns `{"status":"ok"}`.

**Running the app on a phone**

- Set `EXPO_PUBLIC_API_URL` in `frontend/.env` to your computer's LAN address (for example `http://192.168.1.5:3000`), not `localhost`, and restart Expo after any `.env` change.
- `npm run dev:app` starts Expo through `frontend/scripts/start.mjs`, which advertises this machine's `.local` hostname. Supabase refuses OAuth return addresses that are bare IP addresses (see [decision 0004](docs/decisions/0004-google-sign-in-return-address.md)).
- Google sign-in uses Supabase Auth with a Google "Web application" OAuth client (no iOS client needed). Setup and the settings the project must have are in [decision 0004](docs/decisions/0004-google-sign-in-return-address.md). Only Google accounts on the consent screen's test-user list can sign in.
- If another program holds port 8081, pass `--port` or accept Expo's prompt.

## Scripts

`npm run dev | build | test | lint` (the last three run in every workspace). `npm run test:data` checks the dish catalog and seed builder. `npm run train:questions -w backend` regenerates the synthetic question-ranker weights (deterministic). Optional database tests run only with a disposable Postgres, see [backend/README.md](backend/README.md).

## Database

`database/supabase/` is a Supabase CLI project. From `database/`: `npx supabase start`, then `npx supabase db reset` applies the migrations and `seed.sql` (needs Docker). `seed.sql` is generated from `database/data/catalog.csv`; see [docs/data-sources.md](docs/data-sources.md). Hosted setup is in [backend/README.md](backend/README.md).
