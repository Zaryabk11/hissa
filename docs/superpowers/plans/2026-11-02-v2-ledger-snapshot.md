# SDD ledger — plan: docs/superpowers/plans/2026-11-02-v2-learning-loop.md

Workspace: /Users/sobanahmad/.codex/worktrees/652f/hissa, branch feature/v2-learning-loop. Baseline 2026-11-02: npm test passed, 24 files/179 tests. Main has a modified session log that stays untouched.

## Preflight scan

| Tasks  | Shared file or interface                            | Finding / ruling                                                                                                    |
| ------ | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1      | auth routes/client/session                          | Internal tests and implementation agree; live Google configuration and device smoke remain external evidence gates. |
| 2      | invite API and migration                            | Internal tests and implementation agree; transactional one-buddy invariant is required.                             |
| 3      | meal-save/streak API and nudge migration            | Internal tests and implementation agree; save-after-items and PKT day are required.                                 |
| 4      | Buddy UI/link                                       | Internal tests and implementation agree; partner owns Today visuals.                                                |
| 5      | feel check-in/API/UI                                | Internal tests and implementation agree; skip writes no row.                                                        |
| 6      | evidence model/training                             | Internal tests and implementation agree; synthetic data is selector-only.                                           |
| 7      | Gemini question/API                                 | Internal tests and implementation agree; generated wording never supplies options/counts.                           |
| 8      | weekly pattern/API/UI                               | Internal tests and implementation agree; seven PKT days and evidence gates are fixed.                               |
| 9      | experiment/demo seed                                | Internal tests and implementation agree; designated demo user must be explicit.                                     |
| 10     | release config/docs                                 | Internal tests and implementation agree; deployment held.                                                           |
| 1 + 4  | app/_layout.tsx and invite-after-auth session       | Task 1 owns auth guard; Task 4 adds link route using the session contract.                                          |
| 1 + 10 | frontend/app.json and env example                   | Task 1 owns OAuth URL scheme; Task 10 adds release values without replacing it.                                     |
| 1 + 3  | backend app.test.ts                                 | Auth smoke and streak smoke use different assertions; integrate sequentially.                                       |
| 2 + 3  | streaks module files and pair status                | Task 3 consumes Task 2 invite/pair service; sequential integration.                                                 |
| 2 + 4  | invite API contract                                 | Task 4 consumes Task 2 endpoints; Task 2 can run alongside Task 1 because they touch no same tracked files.         |
| 3 + 4  | status/nudge API contract                           | Task 4 consumes Task 3; build after backend interface lands.                                                        |
| 3 + 10 | docs/architecture.md                                | Task 10 appends release details after Task 3.                                                                       |
| 4 + 5  | tabs layout and app navigation                      | Task 5 adds Feel tab after Buddy UI is integrated.                                                                  |
| 5 + 6  | feel.repository.ts and observation contract         | Task 6 consumes owner-scoped history from Task 5.                                                                   |
| 5 + 7  | feel service/controller/routes/schemas              | Task 7 layers questions after real check-ins.                                                                       |
| 5 + 8  | feel service/repository/routes/UI                   | Task 8 layers weekly card after check-ins.                                                                          |
| 5 + 9  | feel service/repository/routes/UI                   | Task 9 adds experiments after check-ins.                                                                            |
| 6 + 7  | evidence selector to question generation            | Task 7 consumes Task 6 model.                                                                                       |
| 6 + 8  | observation type to weekly pattern                  | Task 8 consumes Task 6 observation type.                                                                            |
| 6 + 9  | personal evidence to experiment provenance          | Task 9 consumes observed pattern key.                                                                               |
| 7 + 8  | feel API/service/UI and pattern evidence            | Task 8 follows Task 7 to avoid file conflicts.                                                                      |
| 7 + 9  | feel API/service/UI                                 | Task 9 follows Task 7.                                                                                              |
| 7 + 10 | docs/PRD.md, architecture.md, AGENTS.md Gemini role | Task 7 owns role clarification; Task 10 reads it.                                                                   |
| 8 + 9  | card key and Feel UI/API                            | Task 9 consumes Task 8 pattern key.                                                                                 |
| 8 + 10 | release checklist vs weekly pattern                 | Release smoke depends on weekly endpoint.                                                                           |
| 9 + 10 | demo seed and release handoff                       | Release documents seed availability; no remote seeding while held.                                                  |

Ruling: User explicitly requested parallel agents in separate worktrees; this overrides the subagent-driven skill default of one implementer at a time. Task 1 and Task 2 have disjoint tracked file ownership and stable contracts. Cost if wrong: cherry-pick conflict or API adjustment, resolved on integration branch.
Ruling: Live Supabase OAuth/dashboard and local device checks cannot be inferred from CLI authentication. Agents must record observed gate status and continue code work; no claim of live login until proven. Cost if wrong: release remains blocked pending configuration/device evidence.
Ruling: Task 1 may add a redirect-only `frontend/app/invite/[code].tsx` route despite Task 4's later ownership, because the app must resolve an invite deep link before login to preserve the code. Task 4 will extend that route to preview/accept; cost if wrong is a small route rework.
External check: Docker daemon responds (29.2.1) but local Supabase DB is not started. CoreSimulatorService is unreachable from this shell; iOS device smoke cannot be claimed yet.
External dependency resolution: system DNS cannot resolve registry.npmjs.org, but direct TLS to a Cloudflare registry IP succeeds. Temporary process-local Node dns.lookup shim at /tmp/hissa-npm-registry-dns.cjs makes `npm view expo-secure-store` succeed without modifying system DNS. Auth agent may use it for dependency installation; shim stays uncommitted.
Task 2 review: spec ❌ / quality Needs fixes. Important: migration leaves `buddy_pairs_participants_read` direct-client policy, exposing pair IDs/invite codes and violating buddy privacy. Fix round 1 assigned to original implementer. Minor (deferred to final review): concurrency test does not force transaction overlap; current mutation test renamed RPC, not lock-removal test. Minor (deferred to final review): global advisory lock comment lacks explicit ponytail throughput ceiling/upgrade path.
Task 1 review: spec ❌ / quality Needs fixes. Important: expired token plus retryable refresh failure leaves provider session non-null, so protected tabs can stay open after API request rejection. Fix round 1 assigned to original implementer. Minor (deferred to final review): invite SecureStore write failure can spin indefinitely. Minor (deferred to final review): initial failed-refresh test lacks gate-closure assertion; implementation fix must include one.
Task 2: fix round 1/5 (1 addressed, 0 open — direct pair read policy removed; commits 45b5398..fbf09bf).
Task 2: complete (commits 2108807..fbf09bf, review clean after fix). Integrated on feature/v2-learning-loop as ee1c8fd and d4d2040. External full Supabase authenticated smoke and voiced mobile demo remain held/unverified.
Task 1: fix round 1/5 (1 addressed, 0 open — stale session gate invalidated; commits 786a4e2..9e08c1e).
Task 1: complete (commits 2108807..9e08c1e, review clean after fix). Integrated on feature/v2-learning-loop as c8970f0 and e03b2b0. Live Supabase provider/redirect/trigger, device OAuth smoke and voiced demo remain unverified external gates.
Ruling: native worktree tool transport failed twice at 127.0.0.1; used Superpowers git fallback. Committed .worktrees/ ignore as 57bb1c7 and created Task 3 branch/worktree from integration. Baseline there: 26 test files, 190 pass, 7 conditional PostgreSQL tests skipped.
