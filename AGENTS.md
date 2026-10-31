# Hissa: rules for coding agents

Hissa is a portion coach app for desi households. See `docs/PRD.md` and `docs/architecture.md`.

## Read first

- If `graphify-out/GRAPH_REPORT.md` exists, read it before answering architecture questions.
- Write only what the task needs. No extra features, options or abstractions.

## Layout

- `frontend/` Expo + TypeScript + Expo Router. `src/features/<feature>/` and `src/shared/`.
- `backend/` Express + TypeScript modular monolith. Modules live in `backend/src/modules/<name>/`.
- `database/supabase/` migrations, seed, RLS.

## Backend architecture rules (enforced by `npm run lint`)

1. Dependency direction: routes -> controller -> service -> repository. Never skip or reverse a layer.
2. A module imports another module only through that module's `index.ts`. Never its repository or internals.
3. External APIs (Gemini, FatSecret) sit behind clients inside their module, injected into services so tests can mock them.
4. Controllers hold no business logic. Repositories hold no business rules. Services never touch HTTP.
5. The backend uses the Supabase service role, which bypasses RLS: scope every query to the authenticated user.

## Product rules

- Gemini only names dishes from our catalog (enum plus "unknown"). It never produces calorie numbers.
- Every number shown to a user is labelled an estimate. Never give medical advice.
- A buddy sees only "logged today" and the streak, never meals, photos or calories.

## Commands

- `npm run dev` backend, `npm run dev:app` Expo, `npm test`, `npm run lint`, `npm run build`.
- Never commit real `.env` files; copy `.env.example`.

## Session Logs

Always commit `.claude-logs/` with your changes.
