# Hissa v2 Learning Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a real two-person Android/iOS Hissa learning loop: Google sign-in, saved-meal buddy accountability, private adaptive Food & Feel questions, and an evidence-backed weekly pattern.

**Architecture:** Extend the existing Expo app and Express modular monolith in vertical slices. Supabase Auth supplies Google sessions; the API verifies bearer tokens and owns all buddy, feeling, and pattern queries. A per-user statistical model and a small synthetic-trained question ranker select a bounded question intent; Gemini drafts wording and the service validates it before display.

**Tech Stack:** Expo SDK 58/React Native/TypeScript/Expo Router; Express 5/TypeScript/Zod/Vitest; Supabase Postgres/Auth/RLS; Gemini structured output; EAS Android APK; Railway release handoff.

**Spec:** `docs/superpowers/specs/2026-11-02-v2-learning-loop-design.md` (approved 2026-11-02). Read it, `AGENTS.md`, `docs/PRD.md`, `docs/architecture.md`, and `graphify-out/GRAPH_REPORT.md` before Task 1.

## Global Constraints

- **Every coding agent must use Superpowers, Ponytail, and Graphify:** invoke the relevant Superpowers workflow (including test-driven development and verification), apply `engineering-suite-ponytail:ponytail` at full intensity to each implementation choice, and use `graphify` to inspect the relevant codebase paths before edits. At execution start use `superpowers:using-git-worktrees` for isolation. User instructions take priority over skill defaults.
- Preserve route → controller → service → repository and public `index.ts` module boundaries; put Gemini behind an injected client. Scope every service-role query to the authenticated user.
- Gemini scan output remains catalog dish slug or `unknown`, never calorie numbers. For Food & Feel it may draft a question from an approved intent and answer set; the service owns evidence, options, and fallback. No diagnosis, causal claim, or automatic food elimination. Label every user-facing numeric quantity an estimate as `AGENTS.md` requires; invite codes are identifiers.
- Information about a buddy is limited to `loggedToday`, shared streak, and delivery state of the nudge; the user's own pending invite code may also be returned to its creator. Never return meals, photos, calories, feelings, experiments, or historical streak rows to a buddy. Direct-client RLS must not expose them either.
- The partner owns v1 screens and the landing page. Keep v2 Expo components plain and replaceable; coordinate shared auth and Today-route changes through an interface note, not a visual redesign.
- Google sign-in only. No push, 9 p.m. reminder, groups, chat, activity tracking, recipes, or web app. Use PKT days, `UTC+05:00`.
- Ordinary weekly cards use the user's **last seven PKT days**, require **at least seven** check-ins overall, and show a category or co-occurrence pattern only with **at least three** relevant check-ins and **60%** consistency. A single feeling belongs to the whole meal.
- Android APK is the remote evaluator artifact. iOS is tested in the current Simulator and optionally on a Mac-connected iPhone via Personal Team; that direct install expires after seven days. Verify current OS versions when building.
- **Deployment execution is paused by the user.** Prepare Railway settings, environment handoff, and smoke commands, but do not run a deploy or claim that a remote APK works until the user resumes deployment and an owner/editor completes it.
- After each working slice, capture a short voiced demo or prepare its exact recording script/evidence for the team. Commit prompt/final-response `.claude-logs/` with code. Prepare daily accomplished/next/blocker updates; do not post externally without authorization.

## Review Focus

1. OAuth cancellation or stale session must leave protected screens closed and send no anonymous buddy/feel request (Task 1 auth smoke and API-client test).
2. Invalid, self, declined, or simultaneously accepted invite codes must not create multiple active buddies (Task 2 service and database tests).
3. A meal with failed item insertion or a save at PKT midnight must never count on the wrong streak day (Task 3 meal/streak tests).
4. A check-in before 90 minutes, after one day, for another user's meal, or repeated for one meal must be rejected (Task 5 service tests).
5. Gemini output with invented options, a diagnosis, or a pattern unsupported by real user data must fall back or be suppressed; synthetic rows must not enter ordinary users' evidence (Tasks 7–9 tests).

## File map and stable contracts

| Area    | Files and responsibility                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth    | `frontend/src/shared/auth/{supabase,session,google}.ts(x)` owns session; `frontend/src/shared/api/client.ts` owns bearer requests; `frontend/app/(auth)/sign-in.tsx`, `frontend/app/_layout.tsx`, `frontend/app/index.tsx` guard routes. Existing `backend/src/modules/auth/*` becomes a small authenticated smoke endpoint.                                                                                                                                                                                                  |
| Buddy   | `backend/src/modules/streaks/*` owns pair/nudge/status rules; `database/supabase/migrations/20261102000200_buddy_invites_and_privacy.sql` and `20261102000300_buddy_nudges.sql` own data constraints; `frontend/src/features/buddy/{api,components}` and `frontend/app/(tabs)/buddy.tsx` own basic UI.                                                                                                                                                                                                                        |
| Meals   | `backend/src/modules/meals/{index,meals.service}.ts` and `backend/src/modules/index.ts` inject the public streaks service after a complete meal save.                                                                                                                                                                                                                                                                                                                                                                         |
| Feel    | `database/supabase/migrations/20261102000400_feel_learning.sql` extends check-ins; `20261102000500_user_experiments.sql` adds one private experiment; `backend/src/modules/feel/{feel.*,question-model,question-bank,gemini-question.client}.ts` own evidence, learning, question generation, and patterns; `backend/scripts/{synthetic-question-data,train-question-ranker}.ts` and generated `question-weights.ts` own reproducible offline training; `frontend/src/features/feel/*` and a plain route own check-ins/cards. |
| Release | `frontend/eas.json`, `frontend/app.json`, `frontend/.env.example`, `backend/.env.example`, `docs/release-v2.md`, and relevant product/architecture docs define build, configuration, smoke, and owner handoff.                                                                                                                                                                                                                                                                                                                |

API contracts to keep stable across tasks:

```ts
type BuddyStatus = {
  pairStatus: 'none' | 'pending' | 'active';
  pendingInviteCode: string | null; // own pending code, never a buddy's private data
  streak: number;
  ownLoggedToday: boolean;
  buddyLoggedToday: boolean | null;
  unreadNudge: boolean;
};
type InvitationPreview = { code: string; status: 'pending' };
type DueCheckin = { mealId: string; eatenAt: string; dishes: string[] } | null;
type QuestionIntent = 'symptom_detail' | 'pre_existing';
type Question = {
  type: QuestionIntent;
  text: string;
  options: { id: string; label: string }[];
  source: 'gemini' | 'fallback';
};
type PatternCard = {
  patternKey: string;
  label: string;
  outcome: string;
  positive: number;
  total: number;
  comparisonPositive?: number;
  comparisonTotal?: number;
  isSample: boolean;
} | null;
```

Endpoints: `GET /api/auth` → `{id}`; `POST /api/streaks/invites` → `{code, linkPath}`; `GET /api/streaks/invites/:code` → `InvitationPreview`; `POST /api/streaks/invites/:code/accept|decline`; `POST /api/streaks/end`; `GET /api/streaks` → `BuddyStatus`; `POST /api/streaks/nudge`; `POST /api/streaks/nudge/ack`; `GET /api/feel/due` → `DueCheckin`; `GET /api/feel/question/:mealId` → `Question`; `POST /api/feel/checkins` accepts `{mealId, energy, stomach, symptom?, questionType?, answerId?}`; `GET /api/feel/weekly` → `PatternCard`; `POST /api/feel/experiments` accepts `{patternKey, action}`; `GET /api/feel/experiments/active`; `POST /api/feel/experiments/:id/tried`. All protected endpoints use the existing bearer-token middleware. Build app links with Expo Linking's `createURL('/invite/<code>')`, not a hard-coded slash form.

---

### Task 1: Shared Google session and authenticated API path

**Files:** Modify `frontend/package.json`, `frontend/app.json`, `frontend/.env.example`, `frontend/src/shared/api/client.ts`, `frontend/app/_layout.tsx`, `frontend/app/index.tsx`, `frontend/app/(auth)/sign-in.tsx`, `backend/src/modules/auth/{index,auth.controller,auth.service}.ts`, `backend/src/__tests__/app.test.ts`, `backend/src/modules/auth/__tests__/auth.service.test.ts`. Create `frontend/src/shared/auth/{supabase,session,google}.ts(x)`.

**Interfaces:** Produces `supabase` client, `useSession(): {session, loading, signOut}`, `signInWithGoogle(): Promise<void>`, and `apiAuthed<T>(path: string, init?: RequestInit): Promise<T>`. `GET /api/auth` returns `{id: req.userId}`. Existing anonymous `apiGet` for health remains usable.

- [ ] **Step 1: Inspect live auth configuration.** Through Supabase MCP (or dashboard if unavailable), verify Google provider, `hissa://` callback allowlist, publishable/anon key, and profile-on-signup trigger in project `zvhwzekbgmuaaiepkcwn`; record observed values/status without writing secrets. Do not mark auth done from CLI login alone.
- [ ] **Step 2: Write failing tests.** In the auth service test assert `getCurrentUser('u1')` returns `{id:'u1'}`; in app test set `req.userId='u1'` in its mocked auth middleware, then assert `GET /api/auth` responds 200 with only `{id:'u1'}`. Add a small pure API-header test if the chosen frontend test setup can run without a new UI dependency; otherwise use the Step 5 phone smoke for token behavior.
- [ ] **Step 3: Run the targeted tests and see the expected 501/missing function failure.** Run `npm run test -w backend -- src/modules/auth/__tests__/auth.service.test.ts src/__tests__/app.test.ts`.
- [ ] **Step 4: Implement the minimum.** Install `@supabase/supabase-js`, `react-native-url-polyfill`, `expo-secure-store`, and `expo-web-browser` with Expo-compatible versions. Use Supabase OAuth plus `WebBrowser.openAuthSessionAsync` and a `hissa` redirect; store the session securely and refresh it. Guard tabs until session loading completes. Attach the access token to `apiAuthed`, reject missing sessions locally, and keep an invite code pending across sign-in. Implement `GET /api/auth` through controller/service using `req.userId`.
- [ ] **Step 5: Verify.** Targeted tests pass; `npm run build -w frontend` and `npm run lint -w frontend` pass. On Android emulator and iOS Simulator, test Google success, cancellation, app restart/session restore, sign-out, expired-session recovery, and `GET /api/auth`. Record OAuth redirect URL actually used. If remote Google configuration is unavailable, mark the smoke as blocked rather than simulated.
- [ ] **Step 6: Commit and evidence.** Commit code plus `.claude-logs/`; capture a sub-minute sign-in demo and give the partner the `useSession`/`apiAuthed` contract.

### Task 2: Invite lifecycle and one-buddy invariant

**Files:** Create `database/supabase/migrations/20261102000200_buddy_invites_and_privacy.sql`. Modify `backend/src/modules/streaks/{streaks.routes,streaks.controller,streaks.service,streaks.repository,streaks.schemas,streaks.types}.ts`. Create/update `backend/src/modules/streaks/__tests__/{invites.service,invites.controller}.test.ts`.

**Interfaces:** `StreaksService.createInvite(userId): Promise<{code,linkPath}>`, `previewInvite(userId,code): Promise<InvitationPreview>`, `respondInvite(userId,code,'accept'|'decline'): Promise<void>`, `endPair(userId): Promise<void>`. Invite codes are six uppercase alphanumeric characters; the client constructs an app link from `linkPath='/invite/<code>'` with manual code fallback. The database operation that accepts/declines an invite must serialize conflicting pair changes, so cross-role pair limits hold under concurrent requests.

- [ ] **Step 1: Write failing service/controller tests.** Assert create returns a six-character code; preview hides participant IDs; self-invite, bad code, already-paired user, and repeated accept fail; decline closes pending invite; two simultaneous accepts leave at most one active pair. Assert each route uses authenticated `userId` and malformed code returns 400.
- [ ] **Step 2: Run targeted tests to confirm failure.** Run `npm run test -w backend -- src/modules/streaks/__tests__/invites.service.test.ts src/modules/streaks/__tests__/invites.controller.test.ts`.
- [ ] **Step 3: Implement schema and API.** Add `declined` to pair status; use a transactional Supabase RPC or equivalent database transaction/lock for accept/decline and one-buddy checks across inviter/invitee roles. Restrict any security-definer RPC execute privilege to the service role. Generate codes with Node `crypto`, retry unique collisions, validate with Zod, and keep repository queries user-scoped. Do not expose another user's profile, meal, or email in preview.
- [ ] **Step 4: Verify database and API.** Run targeted tests, then reset a local Supabase database with the migration and use two authenticated test users to exercise accept, decline, simultaneous accept, and end. A new pair's streak starts at acceptance, never inherits days from an old pair.
- [ ] **Step 5: Commit and evidence.** Commit migration/API/tests/logs; save a brief API contract example for the partner and a short two-account invite demo.

### Task 3: Real saved-meal streak, private status, and daily nudge

**Files:** Create `database/supabase/migrations/20261102000300_buddy_nudges.sql`. Modify `backend/src/modules/streaks/{index,streaks.service,streaks.repository,streaks.routes,streaks.controller}.ts`, `backend/src/modules/meals/{index,meals.service}.ts`, `backend/src/modules/index.ts`, `backend/src/modules/meals/__tests__/meals.service.test.ts`, `backend/src/modules/streaks/__tests__/streaks.service.test.ts`, `backend/src/__tests__/app.test.ts`, `docs/architecture.md`.

**Interfaces:** `StreaksService.markMealSaved(userId: string, eatenAt: string): Promise<void>` upserts one PKT `streak_days` row only after meal items save. `getStatus(userId,now?): Promise<BuddyStatus>`, `nudge(userId,now?): Promise<void>`, `ackNudge(userId): Promise<void>`. `GET /api/streaks` returns only the `BuddyStatus` shape above; no meal details. Nudge is allowed only when active buddy has not logged today and sender has not nudged today.

- [ ] **Step 1: Write failing tests.** Assert saved complete meal calls `markMealSaved` once with DB `eatenAt`; failed item insert calls it zero times; PKT 23:59/00:00 maps to distinct days; shared streak counts only consecutive completed days since `accepted_at`; one missing prior day resets it; nudge duplicate and nudge after buddy logged are rejected; response has no private fields.
- [ ] **Step 2: Run targeted tests to confirm failure.** Run `npm run test -w backend -- src/modules/meals/__tests__/meals.service.test.ts src/modules/streaks/__tests__/streaks.service.test.ts`.
- [ ] **Step 3: Implement the minimum.** Inject the streaks public service into meals from `backend/src/modules/index.ts`; mark after successful item insert. Add nudge table with unique sender/day constraint and recipient read state. Compute status from the pair and day rows, with a user-scoped repair path from real saved meals if a prior mark failed; never return queried meal rows. Narrow direct-client `streak_days` RLS to owner-only in the migration.
- [ ] **Step 4: Verify.** Run targeted tests, `npm run lint -w backend`, `supabase --workdir database db reset`, local RLS checks using authenticated users, and a two-account save/status/nudge smoke against the local stack. Status must reflect a save within seconds; a stale open Buddy screen will refresh at most every five seconds in Task 4.
- [ ] **Step 5: Commit and evidence.** Commit code/migration/tests/logs and record a short saved-meal-to-both-status demo.

### Task 4: Basic Buddy screen and invite deep link

**Files:** Create `frontend/src/features/buddy/api/buddy.ts`, `frontend/src/features/buddy/components/BuddyPanel.tsx`, `frontend/app/invite/[code].tsx`. Modify `frontend/app/(tabs)/buddy.tsx`, `frontend/app/_layout.tsx` only for link routing, and `frontend/app/(tabs)/today.tsx` only through a small status component agreed with the partner.

**Interfaces:** `buddy.ts` exports `getBuddyStatus(): Promise<BuddyStatus>`, `createInvite()`, `previewInvite(code)`, `respondInvite(code,decision)`, `sendNudge()`, `ackNudge()`. The invite screen preserves code through OAuth and never accepts a pair before an explicit tap.

- [ ] **Step 1: Define checkable UI cases.** In a lightweight screen-state test or review fixture, assert `none` shows Create/Enter Code, `pending` shows code/share/cancel, `active` shows only both logged flags/streak/eligible nudge, and invalid/declined code shows an error. Keep layout plain and accessible.
- [ ] **Step 2: Verify the fixture fails against the placeholder.** Run the chosen frontend test if added; otherwise capture the placeholder state on Simulator as the red check before editing.
- [ ] **Step 3: Implement the screen.** Use `apiAuthed`, simple native controls, app-link share plus code fallback, and focus refresh/polling while visible (five seconds maximum) so the second phone sees a meal save promptly. On app open show and acknowledge an unread nudge without push. Coordinate any Today card with the partner rather than replacing their screen.
- [ ] **Step 4: Verify.** `npm run build -w frontend` and `npm run lint -w frontend` pass; exercise create, preview, accept, decline, unpair, and nudge on Android/iOS against local fixtures. Check an invite link both signed-in and signed-out. The two real Google-account smoke against hosted Supabase remains a release gate until remote migrations are authorized.
- [ ] **Step 5: Commit and evidence.** Commit files/logs and record a sub-minute pairing and nudge demo.

### Task 5: Real, timely Food & Feel check-in

**Files:** Create `database/supabase/migrations/20261102000400_feel_learning.sql`. Modify `backend/src/modules/feel/{feel.routes,feel.controller,feel.service,feel.repository,feel.schemas,feel.types}.ts`, `backend/src/modules/feel/__tests__/feel.service.test.ts`. Create `frontend/src/features/feel/api/feel.ts`, `frontend/src/features/feel/components/CheckinPanel.tsx`, `frontend/app/(tabs)/feel.tsx`; modify `frontend/app/(tabs)/_layout.tsx`.

**Interfaces:** `FeelService.getDue(userId: string, now?: Date): Promise<DueCheckin>` selects one owner meal at least 90 minutes and at most 24 hours old, with no completed check-in. `submitCheckin(userId, input, now?): Promise<{id:string}>` accepts `energy: low|okay|good`, `stomach: heavy|fine|light`, and optional `symptom: bloated|upset|other|not_sure`. Migration adds optional `symptom`, `question_type`, `answer_id`, and `question_source` fields to existing `feel_checkins` rather than a generic journal table.

- [ ] **Step 1: Write failing service/schema tests.** Assert 89 minutes is not due, 90 minutes is due, a 25-hour-old meal is excluded, another user's meal cannot be submitted, and a second response for one meal is rejected. Assert only allowed enum answers persist and a skipped symptom remains null.
- [ ] **Step 2: Run tests to confirm failure.** Run `npm run test -w backend -- src/modules/feel/__tests__/feel.service.test.ts`.
- [ ] **Step 3: Implement the API and plain screen.** Query owner meals through a user-scoped repository; only confirmed catalog dishes appear in the due summary. Keep the baseline two taps for energy and stomach, with at most one optional symptom/follow-up tap. The route shows “nothing due” when appropriate and permits skip without writing a fabricated response.
- [ ] **Step 4: Verify.** Run targeted test, backend/frontend lint and builds, then save a real meal and check that it is unavailable before 90 minutes and available afterward using a controlled clock/test fixture. On a phone, complete a check-in and see it disappear from due.
- [ ] **Step 5: Commit and evidence.** Commit migration/API/UI/tests/logs and record a short meal-to-feeling demo using a test clock, clearly explaining that the live wait is 90 minutes.

### Task 6: Per-user evidence model and synthetic question-ranker experiment

**Files:** Create `backend/src/modules/feel/question-model.ts`, `backend/src/modules/feel/question-weights.ts`, `backend/src/modules/feel/__tests__/question-model.test.ts`, `backend/scripts/synthetic-question-data.ts`, `backend/scripts/train-question-ranker.ts`. Modify `backend/package.json` for `train:questions` and `backend/src/modules/feel/feel.repository.ts` for owner-scoped history.

**Interfaces:** `buildEvidence(observations: MealObservation[]): Evidence` uses each check-in's _whole confirmed meal_ and `Beta(1,1)` smoothed symptom counts for meals with/without a confirmed dish. `rankQuestions(evidence: Evidence, weights: QuestionWeights): QuestionIntent[]` returns approved `symptom_detail` or `pre_existing` intents, never a diagnosis. `npm run train:questions -w backend` writes deterministic `question-weights.ts` and a held-out metric report. `MealObservation` includes `userId`, `mealId`, `eatenAt`, confirmed `{slug,category}` dishes, energy/stomach/symptom, and optional answer; the repository passes only rows whose `userId` equals the authenticated user.

- [ ] **Step 1: Write failing pure-model tests.** Assert one mixed biryani+raita meal produces a whole-meal observation but no raita conclusion; repeated raita co-occurrence raises candidate relevance only with comparison meals; zero/one observation uses a generic intent; adding a new real check-in changes the posterior score; synthetic rows and other-user rows are never in an ordinary user's evidence query.
- [ ] **Step 2: Run tests to confirm failure.** Run `npm run test -w backend -- src/modules/feel/__tests__/question-model.test.ts`.
- [ ] **Step 3: Implement the smallest trainable selector.** Generate seeded synthetic trajectories with explicit hidden patterns, noise, mixed meals, and null patterns. Fit a small linear ranker to select between approved intents from evidence features, reserving disjoint random seeds for the held-out set. Record dataset generator version, weights, baseline score, held-out score, and no-clinical-validity note. Do not train on another real user's private data. The runtime still computes its personal posterior from each user's real rows, so it personalizes immediately without a Gemini tuning job.
- [ ] **Step 4: Verify training honestly.** Run `npm run train:questions -w backend` twice and confirm byte-identical weights/metrics; run model tests. If held-out relevance does not beat the fixed-question baseline or real testers find questions confusing, disable the offline ranker in the release and use the transparent posterior/fixed intents; keep the experiment and result in the repo.
- [ ] **Step 5: Commit and evidence.** Commit model, generator, metric report, tests, and logs. Demo a synthetic timeline changing the selected question, with “synthetic” visible throughout.

### Task 7: Gemini-drafted question with exact option validation

**Files:** Create `backend/src/modules/feel/question-bank.ts`, `backend/src/modules/feel/gemini-question.client.ts`, `backend/src/modules/feel/__tests__/gemini-question.client.test.ts`, `backend/src/modules/feel/__tests__/question.service.test.ts`. Modify `backend/src/modules/feel/{index,feel.service,feel.controller,feel.routes,feel.schemas}.ts`, `AGENTS.md`, `docs/PRD.md`, `docs/architecture.md`.

**Interfaces:** `QuestionBank` allows only `symptom_detail` options `bloated|upset|other|not_sure` and `pre_existing` options `yes|no|not_sure`. `GeminiQuestionClient.draft(input: {intent: QuestionIntent; evidenceSummary: string; allowedOptionIds: string[]}): Promise<{text:string; optionIds:string[]}>`. `FeelService.getQuestion(userId,mealId): Promise<Question>` obtains personal evidence, picks an intent, asks Gemini for wording, then returns canonical option labels from the bank; `source:'fallback'` on timeout, invalid JSON, invented/missing option ID, or unsafe wording.

- [ ] **Step 1: Write failing tests.** Mock Gemini returning valid wording, extra option, omitted option, malformed JSON, “you are lactose intolerant,” unsupported numbers, and timeout. Assert exact approved option IDs/order regardless of model output, and fallback text for every invalid case. Assert no question can be requested for another user's meal or an ineligible check-in.
- [ ] **Step 2: Run tests to confirm failure.** Run `npm run test -w backend -- src/modules/feel/__tests__/question.service.test.ts src/modules/feel/__tests__/gemini-question.client.test.ts`.
- [ ] **Step 3: Implement the bounded client and endpoint.** Follow the existing scan Gemini REST client style, but use a separate injected client inside `feel`. Send only a compact aggregate evidence summary, no complete meal history or buddy data. Request structured JSON and check schema plus a small denylist/approved-intent guard; never let Gemini produce counts, diagnoses, food restrictions, or arbitrary option labels. Use canonical bank text on failure. Update the repo's old “Gemini only names dishes” wording to distinguish scan and bounded question drafting, preserving the calorie rule.
- [ ] **Step 4: Verify.** Run targeted tests, `npm run lint`, `npm run build`, and manually inspect a sample of generated questions against their actual input summaries. Document false/unsafe outputs found; do not claim “always meaningful” from schema validation alone.
- [ ] **Step 5: Commit and evidence.** Commit client/API/docs/tests/logs and show one standard and one personalized question in a short demo, with evidence counts visible only to the owner.

### Task 8: Weekly pattern card from observed meals

**Files:** Create `backend/src/modules/feel/weekly-pattern.ts`, `backend/src/modules/feel/__tests__/weekly-pattern.test.ts`, `frontend/src/features/feel/components/PatternCard.tsx`. Modify `backend/src/modules/feel/{feel.service,feel.repository,feel.routes,feel.controller}.ts`, `frontend/src/features/feel/api/feel.ts`, `frontend/app/(tabs)/feel.tsx`.

**Interfaces:** `weeklyPattern(observations: MealObservation[], now: Date, isSample = false): PatternCard` uses last seven PKT days. Require seven check-ins overall; for category patterns require three relevant observations and a response frequency of at least 60%. For a dish co-occurrence card require at least three exposed and three unexposed observations, an exposed outcome rate of at least 60%, and an observed difference of at least 25 percentage points; otherwise return a question/insufficient-data state, not a claim. The result carries exact logged counts, `isSample`, and a stable `patternKey` for Task 9.

- [ ] **Step 1: Write failing tests.** Assert six total check-ins yields no card; seven with fewer than three relevant yields no pattern; exactly three relevant with two matching passes 60%; a supported good-energy pattern can appear as well as discomfort; one mixed meal cannot single out a dish; exposed/comparison counts and 25-point gap are required; PKT week boundary is correct; label contains “meals containing” and no causal or diagnostic copy.
- [ ] **Step 2: Run tests to confirm failure.** Run `npm run test -w backend -- src/modules/feel/__tests__/weekly-pattern.test.ts`.
- [ ] **Step 3: Implement deterministic pattern selection and UI.** Group by confirmed dish category and whole-meal composition, never predicted scan slugs. Display one highest-supported pattern with its numerator/denominator and an “in your logs” qualifier; if evidence is thin, show progress toward seven check-ins instead of a conclusion. The ordinary endpoint accepts no `userId` parameter and uses the token's user only.
- [ ] **Step 4: Verify.** Run targeted tests, lint/build, and compare card text to raw rows for a local tester and a labelled sample account. Verify no card appears from synthetic training fixtures in an ordinary account. Repeat with a real Google account after the held remote migration/deployment gates resume.
- [ ] **Step 5: Commit and evidence.** Commit pattern/API/UI/tests/logs and record a short day-seven demo with the exact underlying check-ins visible only on the demo account.

### Task 9: Private “try next time” action and labelled demo history

**Files:** Create `database/supabase/migrations/20261102000500_user_experiments.sql`, `backend/src/modules/feel/__tests__/experiments.service.test.ts`, `database/scripts/seed-demo-history.mjs`, `database/scripts/seed-demo-history.test.mjs`; modify `backend/src/shared/config/index.ts`, `backend/src/modules/feel/{index,feel.repository,feel.service,feel.routes,feel.controller,feel.schemas}.ts`, `frontend/src/features/feel/{api/feel.ts,components/PatternCard.tsx}`, and `frontend/app/(tabs)/feel.tsx`.

**Interfaces:** `createExperiment(userId,patternKey,action)` accepts one active action from `smaller_portion|different_side|observe_again`, linked to a card from that user's own evidence. `getActiveExperiment(userId)` and `markTried(userId,id,mealId)` are owner-only; only a later owner meal can mark it tried. Optional backend `DEMO_USER_ID` is the sole account allowed to show `isSample:true`. `seed-demo-history.mjs` takes that explicit existing demo-only Supabase user ID and seeds two weeks idempotently; it never creates or stores Google credentials. Its card returns `isSample:true` and visible sample labeling.

- [ ] **Step 1: Write failing tests.** Assert an action cannot be created from another user's card, only one is active, another user's meal cannot mark it tried, and a later matching meal can. Assert demo seed is repeatable, writes only the designated demo account, and does not affect ordinary user's model or weekly card.
- [ ] **Step 2: Run tests to confirm failure.** Run `npm run test -w backend -- src/modules/feel/__tests__/experiments.service.test.ts` and `npm run test:data`.
- [ ] **Step 3: Implement private experiment and seed.** Keep the action list short and user-selected. Store enough provenance to compare later check-ins without declaring causality. Use service-role credentials only in a local/admin script environment, never in Expo or committed files. Label every demo card and demo timeline as sample data.
- [ ] **Step 4: Verify.** Run targeted tests, lint/build, idempotent seed dry run against local Supabase, then two real-account privacy checks. The designated team Google account is supplied at implementation; if it is unavailable, leave the seed script ready and mark the demo-history gate blocked, not populated.
- [ ] **Step 5: Commit and evidence.** Commit code/migration/script/tests/logs and record a demo of choosing and reviewing one action.

### Task 10: Release preparation, device checks, and owner deployment handoff

**Files:** Create `frontend/eas.json`, `docs/release-v2.md`. Modify `frontend/app.json`, `frontend/.env.example`, `backend/.env.example`, `backend/README.md`, `docs/architecture.md`, `docs/superpowers/plans/2026-11-01-roadmap-v1-v2-v3.md`, and partner-facing API contract note if needed. Do **not** add deprecated `railway.json` for a new Railway service; current Railway docs prefer Infrastructure as Code or service settings.

**Interfaces:** EAS `preview` profile produces an installable Android APK, with public `EXPO_PUBLIC_API_URL` and Supabase public values injected at build time. `docs/release-v2.md` gives the owner Railway monorepo settings: repository root, build `npm ci && npm run build -w backend`, start `npm run start -w backend`, health path `/api/health`, required backend secrets, and post-deploy smoke commands. It also records iOS Simulator and direct-device steps, exact tested OS/build versions, and the evaluator Android link once available.

- [ ] **Step 1: Write a release checklist and verify prerequisites.** Confirm EAS/Expo account access, Android package ID, current iOS/Android OS versions, Google redirect allowlist, remote Supabase migrations, and an owner/editor for Railway. The user has paused deployment: mark this gate `held` in the document.
- [ ] **Step 2: Prepare and locally validate build settings.** Configure only an Android APK preview build; verify `npm test`, `npm run lint`, `npm run build`, `npm run test:data`, and `npx expo-doctor@latest` from `frontend/`. Check no service-role key or `.env` file enters the client bundle or git.
- [ ] **Step 3: Test supported devices.** On current Android emulator and a real Android device, test Google callback, invite link/code, save-to-streak, nudge, check-in, and weekly card. On current iOS Simulator and optionally a Mac-connected iPhone, test the same flows. Record exact OS versions and failures; do not equate simulator pass with physical-device pass.
- [ ] **Step 4: Hold deployment and remote APK claim.** Prepare the owner handoff but do not run `railway up`, `vercel deploy`, `supabase db push` on the remote project, or publish an evaluator APK that points at localhost while the pause remains. When the user resumes deployment, an authorized owner/editor applies migrations and Railway config, sets secrets, verifies `/api/health` and two real Google accounts, then builds/shares the APK with the public URL. The partner links it from the landing page.
- [ ] **Step 5: Final evidence and commit.** Commit release docs/config/logs, collect sub-minute voiced demos for each working slice, prepare a concise daily team update and pair-programming evidence, then run a whole-branch review and verify final status. Report any held external gate plainly.

## Self-review and execution gate

- Spec coverage: Task 1 covers shared Google auth; Tasks 2–4 cover invite/decline, real streak, privacy, nudge, and basic mobile UI; Tasks 5–9 cover timely check-in, per-user model, synthetic training, Gemini wording, weekly evidence, experiment, and demo account; Task 10 covers APK/iOS checks and the paused deployment handoff. The partner's v1 screens and landing page remain a stated external dependency.
- Type check: use the contract names above in controllers, clients, and tests; `questionType`/`answerId` are optional on check-in but must be a valid pair if present. `patternKey` is issued only for a real qualifying card or the designated sample card.
- Review Focus mapping: each of the five failure modes has a named test or smoke in its owning task.
- No product implementation begins from this plan until the user reviews it and chooses the execution approach. Deployment remains held even after coding starts, unless the user explicitly resumes it.

## Source notes for executors

Use [Supabase's Expo social sign-in guide](https://supabase.com/docs/guides/auth/quickstarts/with-expo-react-native-social-sign-in) and [Expo WebBrowser guidance](https://docs.expo.dev/versions/latest/sdk/webbrowser/) for the mobile Google callback; test the actual Supabase redirect allowlist. [Railway monorepo guidance](https://docs.railway.com/deployments/monorepo) describes root/build/start settings. [Railway Config as Code](https://docs.railway.com/config-as-code) is deprecated for new services, so keep this release on owner-applied service settings while deployment is held.
