# Architecture

Hissa is an npm-workspaces monorepo: an Expo app, a Node/Express API (modular monolith) and a Supabase project.

```
hissa/
  frontend/            Expo + TypeScript + Expo Router
    app/               routes: (auth), (tabs)/today|scan|buddy
    src/features/      <feature>/{components,hooks,api}
    src/shared/        api client, theme, ui
  backend/src/
    app.ts, server.ts
    shared/            config, db, errors, middleware, logger, time (PKT day)
    modules/<name>/    auth profiles scan nutrition plan meals streaks feel
  database/
    data/catalog.csv   the dish catalog (78 dishes), see data-sources.md
    scripts/           build-seed.mjs turns catalog.csv into seed.sql, plus tests
    supabase/          config.toml, migrations/, seed.sql (generated)
```

Status: v1 (scan, nutrition, profiles, plan, meals) is built. `streaks` and `feel` (v2 and v3) and `auth` are stubs that return 501.

## Backend rules

Each module under `backend/src/modules/<name>/` has these files:

```
<name>.routes.ts       HTTP routes only
<name>.controller.ts   maps HTTP to service calls, no business logic
<name>.service.ts      business rules
<name>.repository.ts   Supabase data access only
<name>.schemas.ts      zod request/response schemas
<name>.types.ts
index.ts               the module's ONLY public API
__tests__/
```

1. **Layer direction:** routes -> controller -> service -> repository. Never skip or reverse a layer.
2. **Module boundary:** a module imports another module only through that module's `index.ts`, never its repository or internals.
3. **External APIs sit behind clients** inside their module (`scan/gemini.client.ts`). Services take them as dependencies so tests can mock them. Nutrition has no external client: it reads the `dishes` table.
4. Every module is mounted at `/api/<name>` behind auth, except `GET /api/health`.

Both rules 1 and 2 are enforced by `no-restricted-imports` in `backend/eslint.config.mjs` (`npm run lint`).

Files beyond the standard set, as built:

```
scan/gemini.client.ts      Gemini REST client (structured output, injected into the service)
scan/resize-photo.ts       sharp: JPEG, longest side 1024 px, EXIF rotation applied
profiles/budget.ts         Mifflin-St Jeor daily calorie budget
shared/time/pkt.ts         PKT day helper (day string and UTC bounds)
```

Modules call each other only through `index.ts`: `scan` and `meals` use `nutrition`, `plan` uses `profiles`, `meals` and `nutrition`.

## Data flow for a scan

```
app photo -> scan: resize (sharp, 1024 px), daily cap check via scan_log,
             Gemini (dish slug from the catalog enum or "unknown" + portion + confidence)
          -> app correction chips for confidence below 0.6 or unknown
          -> plan: nutrition (per-100g from the dishes table x grams per unit)
             fitted to the remaining daily budget
          -> meals: save predicted AND confirmed items -> today's log
          -> streaks (mark the PKT day): v2, not built
```

Gemini names dishes only from our catalog. Calories always come from the `dishes` table (`kcal_per_100g * grams_per_unit * units / 100`), never from Gemini and never stored per portion.

Over the daily cap (10 scans per user per PKT day, `SCAN_DAILY_CAP`) or when Gemini is unavailable, `POST /api/scan` returns `mode: "manual"` with a `reason` (`daily_cap` or `gemini_unavailable`) and the app lets the user pick dishes by hand. The scan flow never dead-ends.

## Database

RLS is on for every table. The backend uses the service role (bypasses RLS) and must scope every query to the authenticated user. Buddies can read only `streak_days`, never meals.

Migrations in `database/supabase/migrations/`:

- `20261030000000_initial_schema.sql`: `profiles`, `dishes`, `meals`, `meal_items`, `buddy_pairs`, `streak_days`, `feel_checkins`, RLS policies.
- `20261101000000_catalog_and_scan_log.sql`: `dishes` gets per-100g columns (`kcal_per_100g` and macros), `source`, `basis`, `unit_basis` and the `bowl` unit; FatSecret and per-unit columns are dropped. New table `scan_log` (one row per scan per user per PKT day) backs the daily cap.
- `20261102000000_profiles_on_signup.sql`: a trigger on `auth.users` creates a `profiles` row at sign-up (with a backfill for existing users), because meals and `scan_log` reference `profiles(id)`.
- `20261102000100_revoke_handle_new_user_execute.sql`: the trigger function cannot be called through the API.

`dishes` is seeded from `database/data/catalog.csv` by `database/scripts/build-seed.mjs` (generated `seed.sql`, upsert only). Sources and portion rules are in [data-sources.md](data-sources.md).

## Decisions

See [decisions/](decisions/).
