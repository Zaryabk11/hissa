# Hissa: rules for coding agents

Hissa is a portion coach app for desi households. See `docs/PRD.md` and `docs/architecture.md`.

## Read first

- Current status and next steps: `docs/superpowers/plans/2026-11-02-v2-status.md`. Read it first when you start work.
- For mobile UI changes, start at `docs/design/mobile/README.md`; its approved visual system and refresh plan replace the older graphite/lime design handoff. The screens already exist: preserve their behavior.
- If `graphify-out/GRAPH_REPORT.md` exists, read it before answering architecture questions (the graph is git-ignored; rebuild the code graph with `graphify update .`).
- Write only what the task needs. No extra features, options or abstractions.

## Layout

- `frontend/` Expo + TypeScript + Expo Router. `src/features/<feature>/` and `src/shared/`.
- `backend/` Express + TypeScript modular monolith. Modules live in `backend/src/modules/<name>/` (`auth profiles nutrition scan streaks notifications friends goals meals plan feel recipes snaps`) (`follows` is designed in `docs/superpowers/specs/2026-11-06-snaps-follows-cheers-design.md`, not built).
- `database/supabase/` migrations, seed, RLS.

## Backend architecture rules (enforced by `npm run lint`)

1. Dependency direction: routes -> controller -> service -> repository. Never skip or reverse a layer.
2. A module imports another module only through that module's `index.ts`. Never its repository or internals.
3. External APIs (Gemini) sit behind clients inside their module, injected into services so tests can mock them.
4. Controllers hold no business logic. Repositories hold no business rules. Services never touch HTTP.
5. The backend uses the Supabase service role, which bypasses RLS: scope every query to the authenticated user.

## Product rules

- Gemini has three bounded jobs. In scan it only names dishes from our catalog (enum plus "unknown"). In Food and Feel it only words one approved question from a compact aggregate summary of the user's own check-ins; the service owns the intent, the options and their order, and falls back to a fixed question on a timeout, invalid JSON, a wrong option list or wording that fails an allowlist of words. Gemini never produces calorie numbers, counts, food restrictions, diagnoses or health claims. The third job is offline and one-off: `backend/scripts/draft-recipes.ts` drafts recipes for catalog dishes, guarded by a banned-word check; it never runs at request time, and nothing is served until a human sets `reviewed: true`.
- Every number shown to a user is labelled an estimate. Never give medical advice.
- A friend sees only username, display name, "logged today", the streak, nudge state, a goal the user chose to share; never calories, meal details or feelings. When `SNAPS_ENABLED` is on, a friend also gets the view-once snap photo of each photographed meal. A follower of a public account sees only that account's snaps, username, display name, bio and follower count (phase 2, not built). Accounts are private by default and only friends cheer. Snap photos live only in the private `snaps` bucket, are returned only by `POST /api/snaps/:id/open` (no URLs), are deleted once every recipient has opened them or after 24 hours, and are never logged. The one exception is a photo someone reports: it is kept up to 30 days in a separate private bucket for review. Under-18s cannot have a public account (phase 2, not built). Gemini never sees snaps.
- Notifications are inbox-only (read through `GET /api/notifications`; snaps are listed at `GET /api/snaps/inbox`); there is no push.
- Clients never write `meals`, `meal_items`, `feel_checkins` or friend, goal, notification, follow, snap, block and report data to Supabase directly; everything goes through the API.

## Commands

- `npm run dev` backend, `npm run dev:app` Expo (through `frontend/scripts/start.mjs`), `npm test`, `npm run lint`, `npm run build`, `npm run test:data`, `npm run train:questions -w backend`.
- Optional database tests need a disposable Postgres (`HISSA_TEST_POSTGRES_CONTAINER`); see `backend/README.md`.
- Do parallel agent work in separate git worktrees; never touch another agent's worktree.
- Never commit real `.env` files; copy `.env.example`.

## Session Logs

Claude Code, Codex CLI, and VS Code Copilot hooks write user prompts and final assistant responses to `.claude-logs/`. Do not add tool calls, tool results, or intermediate reasoning to these logs. Always commit `.claude-logs/` with your changes.
