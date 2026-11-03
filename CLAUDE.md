# Hissa: rules for coding agents

Hissa is a portion coach app for desi households. See `docs/PRD.md` and `docs/architecture.md`.

## Read first

- Current status and next steps: `docs/superpowers/plans/2026-11-02-v2-status.md`. Read it first when you start work.
- If `graphify-out/GRAPH_REPORT.md` exists, read it before answering architecture questions (the graph is git-ignored; rebuild the code graph with `graphify update .`).
- Write only what the task needs. No extra features, options or abstractions.

## Layout

- `frontend/` Expo + TypeScript + Expo Router. `src/features/<feature>/` and `src/shared/`.
- `backend/` Express + TypeScript modular monolith. Modules live in `backend/src/modules/<name>/`.
- `database/supabase/` migrations, seed, RLS.

## Backend architecture rules (enforced by `npm run lint`)

1. Dependency direction: routes -> controller -> service -> repository. Never skip or reverse a layer.
2. A module imports another module only through that module's `index.ts`. Never its repository or internals.
3. External APIs (Gemini) sit behind clients inside their module, injected into services so tests can mock them.
4. Controllers hold no business logic. Repositories hold no business rules. Services never touch HTTP.
5. The backend uses the Supabase service role, which bypasses RLS: scope every query to the authenticated user.

## Product rules

- Gemini has two bounded jobs. In scan it only names dishes from our catalog (enum plus "unknown"). In Food and Feel it only words one approved question from a compact aggregate summary of the user's own check-ins; the service owns the intent, the options and their order, and falls back to a fixed question on a timeout, invalid JSON, a wrong option list or unsafe wording. Gemini never produces calorie numbers, counts, food restrictions, diagnoses or health claims.
- Every number shown to a user is labelled an estimate. Never give medical advice.
- A buddy sees only "logged today", the streak and nudge state, never meals, photos, calories or feelings.
- Clients never write `meals`, `meal_items`, `feel_checkins` or buddy data to Supabase directly; everything goes through the API.

## Commands

- `npm run dev` backend, `npm run dev:app` Expo (through `frontend/scripts/start.mjs`), `npm test`, `npm run lint`, `npm run build`, `npm run test:data`, `npm run train:questions -w backend`.
- Optional database tests need a disposable Postgres (`HISSA_TEST_POSTGRES_CONTAINER`); see `backend/README.md`.
- Do parallel agent work in separate git worktrees; never touch another agent's worktree.
- Never commit real `.env` files; copy `.env.example`.

## Session Logs

Claude Code, Codex CLI, and VS Code Copilot hooks write user prompts and final assistant responses to `.claude-logs/`. Do not add tool calls, tool results, or intermediate reasoning to these logs. Always commit `.claude-logs/` with your changes.
