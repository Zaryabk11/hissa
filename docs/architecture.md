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
    shared/            config, db, errors, middleware, logger
    modules/<name>/    auth profiles scan nutrition plan meals streaks feel
  database/supabase/   config.toml, migrations/, seed.sql
```

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
3. **External APIs sit behind clients** inside their module (`scan/gemini.client.ts`, `nutrition/fatsecret.client.ts`, `nutrition/local-table.ts`). Services take them as dependencies so tests can mock them.
4. Every module is mounted at `/api/<name>` behind auth, except `GET /api/health`.

Both rules 1 and 2 are enforced by `no-restricted-imports` in `backend/eslint.config.mjs` (`npm run lint`).

## Data flow for a scan

```
app photo -> scan (Gemini: dish slugs + portion + confidence)
          -> app correction chips -> nutrition (FatSecret, else local table)
          -> plan (fit portions to remaining budget) -> meals (save predicted + confirmed)
          -> streaks (mark the PKT day)
```

Gemini names dishes only from our catalog. Calories always come from FatSecret or the local table.

## Database

RLS is on for every table. The backend uses the service role (bypasses RLS) and must scope every query to the authenticated user. Buddies can read only `streak_days`, never meals.

## Decisions

See [decisions/](decisions/).
