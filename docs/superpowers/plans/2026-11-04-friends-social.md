# Friends Social Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the one-to-one buddy with many-to-many friends: usernames, requests, a friends list with personal streaks, nudges, an in-app inbox, shared habit goals with celebrations and cheers.

**Architecture:** Three new backend modules (`friends`, `goals`, `notifications`) beside a slimmed `streaks` (personal streaks only) and a `profiles` module that gains usernames. Dependencies point one way: `notifications` -> `profiles`; `friends` -> `streaks`, `profiles`, `notifications`; `goals` -> `streaks`, `friends`, `notifications`; `meals` -> `streaks`, `goals`. Plain repository queries on new tables (no SQL functions, no advisory lock); races are settled by unique indexes and conditional updates. The frontend swaps the Buddy tab for a Social tab (Friends view only) plus an inbox screen.

**Tech Stack:** Express 5, TypeScript, zod, supabase-js (service role), vitest + supertest; Expo SDK 58, expo-router, React Native.

**Spec:** `docs/superpowers/specs/2026-11-04-friends-social-design.md`. Read it first; `[call]` marks decisions the executor must follow.

## Global Constraints

- Backend layering is enforced by `npm run lint`: routes -> controller -> service -> repository; modules import each other only via `index.ts`; add each new module name to the `modules` array in `backend/eslint.config.mjs`.
- Every query is scoped to the authenticated user (service role bypasses RLS). New tables: RLS enabled, all privileges revoked from `anon` and `authenticated`.
- Clients never write friendship, goal, notification or nudge data to Supabase; only through the API.
- A friend sees only: username, display name, streak, logged today, nudge state, and a shared goal's title and progress. Never meals, photos, calories, feelings.
- Time is Karachi time via `pktDay` in `backend/src/shared/time/pkt.ts`. "Logged" means a `streak_days` row.
- Username: `^[a-z0-9_]{3,20}$`, unique, nullable column. Friend cap 50. Search: prefix, min 3 chars, max 10 results. One nudge per sender per recipient per PKT day.
- Streak is personal: consecutive PKT days ending today or yesterday. No group chain; the group line is a count.
- Goals: at most one active; types `streak` ("log N days in a row") and `window` ("log M days within D days"); only days on or after the goal's start day count; progress is computed, sharing is off by default; celebration cards live 48 hours.
- No push notifications. Inbox only. Numbers shown to users are estimates; no medical advice.
- Commit `.claude-logs/` with changes (project rule). Do parallel agent work in separate worktrees.

## Review Focus

Each line has a test in the owning task.

1. Usernames: uppercase, spaces, too short/long, reserved-looking input, and two users claiming the same name at once -> 400 / 409, never a 500 (Task 2).
2. Friend requests: to self, duplicate, simultaneous mutual requests, after decline/removal, and at the 50-friend cap -> exactly one friendship row, clear 4xx (Task 5).
3. Nudges: friend logged between list load and tap, second nudge same day, non-friend target -> rejected with 400/404, no inbox row (Task 5).
4. Privacy: the friends overview, celebrations and inbox payloads contain only whitelisted fields; a removed friend vanishes from lists, celebrations and cheers; a non-friend cannot cheer (Tasks 5, 6).
5. Goals: created while the user already has a long streak must not complete instantly; reaching a goal fires once even with two meals saved back to back; an unreached `window` goal expires and frees the slot (Task 6).
6. Migration: zero buddy pairs, a pending invite only, and an active pair all migrate cleanly; PKT midnight boundary for `streak_days` backfill (Task 1).

---

## File Structure

- Create `database/supabase/migrations/20261104000000_friends_goals_notifications.sql`.
- Modify `backend/src/modules/profiles/*` (username), `backend/src/modules/streaks/*` (slim down), `backend/src/modules/meals/*` (call goals), `backend/src/modules/index.ts`, `backend/eslint.config.mjs`.
- Create `backend/src/modules/{notifications,friends,goals}/` with `index`, `*.routes`, `*.controller`, `*.service`, `*.repository`, `*.schemas`, `*.types` and `__tests__/`.
- Create `frontend/src/features/social/` (api, view model, content, components), `frontend/app/(tabs)/social.tsx`, `frontend/app/inbox.tsx`.
- Delete `frontend/src/features/buddy/`, `frontend/app/(tabs)/buddy.tsx`, `frontend/app/invite/[code].tsx`, the pending-invite helpers in `frontend/src/shared/auth/session.tsx`, backend invite code and tests.

---

### Task 1: Database migration

**Files:**
- Create: `database/supabase/migrations/20261104000000_friends_goals_notifications.sql`
- Test: `backend/src/modules/friends/__tests__/friends.database.test.ts` (skipped unless `HISSA_TEST_POSTGRES_CONTAINER` is set; copy the `sql()` helper pattern from `backend/src/modules/streaks/__tests__/streaks.database.test.ts`)

**Interfaces:**
- Produces tables (all `public.`):
  - `profiles.username text unique check (username ~ '^[a-z0-9_]{3,20}$')`.
  - `friendships(id uuid pk, user_low uuid, user_high uuid, requested_by uuid, status text check in ('pending','active','declined','removed'), created_at, accepted_at, updated_at; check user_low < user_high; unique(user_low, user_high))`.
  - `notifications(id uuid pk, user_id uuid, kind text check in ('friend_request','request_accepted','nudge','goal_reached','cheer'), actor_id uuid, goal_id uuid null, day date null, created_at, read_at)` with a partial unique index on `(actor_id, user_id, day) where kind = 'nudge'`.
  - `goals(id uuid pk, user_id uuid, type text check in ('streak','window'), target int, window_days int null, start_day date, status text check in ('active','reached','abandoned','expired'), shared boolean default false, created_at, reached_at)` with a partial unique index on `(user_id) where status = 'active'`.
  - `goal_cheers(goal_id uuid, user_id uuid, created_at, primary key (goal_id, user_id))`.
  - All foreign keys `on delete cascade`.

- [ ] **Step 1: Write the DB test** (skipIf no container): active pair migrated to one `active` friendship with its `accepted_at`; a pending-only invite produces no friendship; `streak_days` has a row for a meal eaten at `2026-11-02T19:30:00Z` on PKT day `2026-11-03` and none for a meal with no confirmed item; second nudge row same (actor, user, day) raises unique violation; two active goals for one user raises; `authenticated` role cannot select from the four new tables.
- [ ] **Step 2: Write the migration.** In order: add `profiles.username`; create the four tables with RLS enabled and `revoke all ... from anon, authenticated`; insert friendships from `buddy_pairs where status = 'active'` using `least/greatest` for the pair order and `inviter_id` as `requested_by`; backfill `streak_days` for all users from `meals` + `meal_items` (confirmed dish only, `Asia/Karachi` day, `on conflict do nothing`; copy the predicate from `buddy_status_operation` in `20261102000300_buddy_nudges.sql`); drop functions `buddy_invite_operation`, `buddy_status_operation`, then tables `buddy_nudges`, `buddy_pairs`.
- [ ] **Step 3: Verify.** Run: `HISSA_TEST_POSTGRES_CONTAINER=<disposable container> npm test -w backend -- friends.database`. Expected: PASS. Without a container the file reports skipped and `npm test` stays green.
- [ ] **Step 4: Commit** `feat(db): friends, goals, notifications tables; retire buddy pairs`.

---

### Task 2: Usernames in the profiles module

**Files:**
- Modify: `backend/src/modules/profiles/{profiles.types,profiles.schemas,profiles.repository,profiles.service,profiles.controller,profiles.routes,index}.ts`
- Test: `backend/src/modules/profiles/__tests__/username.test.ts`

**Interfaces:**
- Produces (exported from `profiles/index.ts`):
  ```ts
  export type PersonCard = { userId: string; username: string | null; displayName: string | null };
  ProfilesService.setUsername(userId: string, username: string): Promise<void>; // ConflictError('Username taken') on 23505
  ProfilesService.searchUsernames(prefix: string, limit: number): Promise<PersonCard[]>;
  ProfilesService.getCards(userIds: string[]): Promise<PersonCard[]>;
  ```
  `Profile` gains `username: string | null`. `PUT /api/profiles/me/username` body `{ username }`, 204. `GET /api/profiles/me` includes `username`. `usernameSchema` in `profiles.schemas.ts` is `z.string().regex(/^[a-z0-9_]{3,20}$/)`.
- Note: `upsertProfile` must not overwrite `username`; keep it out of the upsert row.

- [ ] **Step 1: Write failing tests** (service with mocked repository, controller via supertest): `setUsername` rejects `'Ab'`, `'UPPER_case'`, `'has space'`, a 21-char name with 400; repository 23505 becomes 409; `PUT /me/username` passes only `req.userId`; `searchUsernames` is called with a lowercased prefix; `getCards([])` returns `[]` without a query; saving the profile (`PUT /me`) does not touch `username`.
- [ ] **Step 2: Run** `npm test -w backend -- username` -> FAIL.
- [ ] **Step 3: Implement** the signatures above; the repository searches with `ilike(prefix + '%')`, escaping `%` and `_` in the prefix, and orders by username.
- [ ] **Step 4: Run** the same command -> PASS. Run `npm run lint -w backend` -> clean.
- [ ] **Step 5: Commit** `feat(profiles): unique usernames and person cards`.

---

### Task 3: Personal streaks (slim the streaks module)

**Files:**
- Modify: `backend/src/modules/streaks/{streaks.service,streaks.repository,streaks.controller,streaks.routes,streaks.schemas,streaks.types,index}.ts`
- Delete: invite/nudge/pair code and `__tests__/invites.*.test.ts`, `__tests__/streaks.database.test.ts`
- Test: rewrite `backend/src/modules/streaks/__tests__/streaks.service.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function computeStreak(days: ReadonlySet<string> | string[], today: string): number;
  export type DayStreak = { streak: number; loggedToday: boolean };
  StreaksService.markMealSaved(userId: string, eatenAt: string): Promise<void>; // unchanged
  StreaksService.getStreaks(userIds: string[], now?: Date): Promise<Record<string, DayStreak>>; // one batch query
  StreaksService.loggedDays(userId: string, fromDay: string, toDay: string): Promise<string[]>;
  ```
  `GET /api/streaks` returns the caller's own `DayStreak`. Remove the export of `BuddyStatus`.

- [ ] **Step 1: Write failing tests:** `computeStreak` with days `[11-03, 11-04]` and today `11-05` -> 2 (yesterday counts); with `[11-05]` today `11-05` -> 1; with `[11-03]` today `11-05` -> 0; a gap resets; empty -> 0. `markMealSaved` keeps the existing PKT-midnight test (`18:59:59Z` -> `2026-11-02`, `19:00:00Z` -> `2026-11-03`). `getStreaks(['a','b'])` issues one repository call and returns a record containing both ids, with an id that has no days present as `{ streak: 0, loggedToday: false }`.
- [ ] **Step 2: Run** `npm test -w backend -- streaks` -> FAIL.
- [ ] **Step 3: Implement.** Repository `daysFor(userIds: string[], toDay: string): Promise<Record<string, string[]>>` is one `.in('user_id', ids)` query limited to the last 400 days; `loggedDays` uses a `gte/lte` range.
- [ ] **Step 4: Run** tests -> PASS; `npm run lint -w backend` may flag callers (`meals`, `index.ts`); leave those for Task 7 only if the failure is import wiring, otherwise fix.
- [ ] **Step 5: Commit** `refactor(streaks): personal streaks, drop buddy pairs`.

---

### Task 4: Notifications module

**Files:**
- Create: `backend/src/modules/notifications/{index,notifications.routes,notifications.controller,notifications.service,notifications.repository,notifications.types}.ts`
- Test: `backend/src/modules/notifications/__tests__/notifications.service.test.ts`, `notifications.route.test.ts`
- Modify: `backend/eslint.config.mjs` (add `'notifications'`)

**Interfaces:**
- Consumes: `ProfilesService.getCards`.
- Produces:
  ```ts
  export type NotificationKind = 'friend_request'|'request_accepted'|'nudge'|'goal_reached'|'cheer';
  export type NewNotification = { userId: string; kind: NotificationKind; actorId: string; goalId?: string; day?: string };
  export type NotificationItem = { id: string; kind: NotificationKind; actor: PersonCard; goalTitle: string | null; createdAt: string; read: boolean };
  NotificationsService.notify(n: NewNotification): Promise<void>; // nudge duplicate -> ConflictError
  NotificationsService.nudgesSentOn(actorId: string, day: string): Promise<string[]>; // recipient ids
  NotificationsService.list(userId: string): Promise<{ items: NotificationItem[]; unread: number }>; // newest first, max 50
  NotificationsService.markAllRead(userId: string): Promise<void>;
  ```
  Routes: `GET /api/notifications`, `POST /api/notifications/read` (204). `goalTitle` is built in the service by `formatGoalTitle(type: GoalType, target: number, windowDays: number | null): string` (`'Log N days in a row'` / `'Log M days in D'`), exported from `notifications/index.ts`; the repository joins `goals` for `type, target, window_days`. The goals module imports `formatGoalTitle` from `notifications` for `Goal.title` and `Celebration.title`, so the wording lives in one place.

- [ ] **Step 1: Write failing tests:** `notify` with `kind:'nudge'` twice for the same (actor, user, day) -> second throws `ConflictError`; `list` returns only the caller's rows, actor cards resolved with `getCards`, and each item has exactly the keys `id, kind, actor, goalTitle, createdAt, read` (assert with `Object.keys`); `unread` counts rows with null `read_at`; `markAllRead` only updates the caller's rows (assert the `user_id` filter); route requires auth (401 when `req.userId` unset).
- [ ] **Step 2: Run** `npm test -w backend -- notifications` -> FAIL.
- [ ] **Step 3: Implement** per the interfaces; a 23505 from the partial unique index maps to `ConflictError`.
- [ ] **Step 4: Run** tests -> PASS, `npm run lint -w backend` clean.
- [ ] **Step 5: Commit** `feat(notifications): inbox module`.

---

### Task 5: Friends module

**Files:**
- Create: `backend/src/modules/friends/{index,friends.routes,friends.controller,friends.service,friends.repository,friends.schemas,friends.types}.ts`
- Test: `backend/src/modules/friends/__tests__/friends.service.test.ts`, `friends.route.test.ts`
- Modify: `backend/eslint.config.mjs` (add `'friends'`)

**Interfaces:**
- Consumes: `StreaksService.getStreaks`, `ProfilesService.searchUsernames/getCards`, `NotificationsService.notify/nudgesSentOn`.
- Produces:
  ```ts
  export type FriendRow = { userId: string; username: string | null; displayName: string | null; streak: number; loggedToday: boolean; nudgedToday: boolean };
  export type FriendsOverview = { friends: FriendRow[]; loggedCount: number; incoming: PersonCard[]; outgoing: PersonCard[] };
  FriendsService.overview(userId: string, now?: Date): Promise<FriendsOverview>;
  FriendsService.search(userId: string, q: string): Promise<PersonCard[]>; // min 3 chars, <= 10, excludes self and anyone with a pending/active friendship
  FriendsService.request(userId: string, username: string): Promise<void>;
  FriendsService.respond(userId: string, fromUserId: string, decision: 'accept' | 'decline'): Promise<void>;
  FriendsService.remove(userId: string, otherUserId: string): Promise<void>;
  FriendsService.nudge(userId: string, friendId: string, now?: Date): Promise<void>;
  FriendsService.friendIds(userId: string): Promise<string[]>;
  FriendsService.areFriends(a: string, b: string): Promise<boolean>;
  ```
  Routes (under `/api/friends`): `GET /overview`, `GET /search?q=`, `POST /requests` body `{ username }`, `POST /requests/:userId/accept`, `POST /requests/:userId/decline`, `DELETE /:userId`, `POST /:userId/nudge`. `:userId` is validated as a uuid. `FriendRow` is built from a whitelist; a test asserts its exact key set.

- [ ] **Step 1: Write failing service tests** (mocked repository and collaborators):
  - `request` to self -> 400; to an unknown username -> 404; when the target already has a pending request to the caller -> friendship becomes `active` and both get a `request_accepted`-type outcome (caller sees active; target is notified `request_accepted`); duplicate pending from the caller -> 400; after `declined` or `removed` a new request succeeds (status back to `pending`, `requested_by` = caller); caller or target at 50 active friends -> 400.
  - `respond` only works for the recipient of a pending request (the requester cannot accept their own) -> otherwise 404; accept notifies the requester `request_accepted`.
  - `remove` sets `removed` for either party; afterwards `friendIds` excludes the user.
  - `nudge`: non-friend -> 404; friend with `loggedToday` -> 400 and `notify` not called; second nudge same day (notify throws `ConflictError`) -> 400; success calls `notify({ userId: friendId, kind: 'nudge', actorId: userId, day })`.
  - `overview`: `loggedCount` counts friends with `loggedToday`; `nudgedToday` true for ids from `nudgesSentOn`; every `FriendRow` has exactly the seven keys above.
- [ ] **Step 2: Run** `npm test -w backend -- friends.service` -> FAIL.
- [ ] **Step 3: Implement.** Repository keys a pair by `[min(a,b), max(a,b)]`; state changes use conditional updates (`.eq('status','pending')`) and a 23505 on insert re-reads and retries the transition once, so simultaneous mutual requests leave one row. `overview` batches: friendships -> ids -> one `getStreaks` + one `getCards`.
- [ ] **Step 4: Write route tests** (supertest, mocked service): identity comes only from `req.userId` (a body `userId` is ignored); `:userId` that is not a uuid -> 400; `q` shorter than 3 -> 400; unauthenticated -> 401.
- [ ] **Step 5: Run** `npm test -w backend -- friends` -> PASS; `npm run lint -w backend` clean.
- [ ] **Step 6: Commit** `feat(friends): requests, list, nudges`.

---

### Task 6: Goals module

**Files:**
- Create: `backend/src/modules/goals/{index,goals.routes,goals.controller,goals.service,goals.repository,goals.schemas,goals.types,progress}.ts`
- Test: `backend/src/modules/goals/__tests__/progress.test.ts`, `goals.service.test.ts`, `goals.route.test.ts`
- Modify: `backend/eslint.config.mjs` (add `'goals'`)

**Interfaces:**
- Consumes: `StreaksService.loggedDays`, `FriendsService.friendIds/areFriends`, `NotificationsService.notify` (and its goal title wording).
- Produces:
  ```ts
  // progress.ts - pure
  export function goalProgress(g: { type: 'streak'|'window'; target: number; windowDays: number | null; startDay: string }, loggedDays: string[], today: string): { progress: number; reached: boolean; expired: boolean };
  export type GoalInput = { type: 'streak' | 'window'; target: number; windowDays?: number; shared: boolean };
  export type Goal = { id: string; type: 'streak'|'window'; target: number; windowDays: number | null; startDay: string; status: 'active'|'reached'|'abandoned'|'expired'; shared: boolean; progress: number; title: string };
  export type Celebration = { goalId: string; actor: PersonCard; title: string; reachedAt: string; cheers: number; cheeredByMe: boolean };
  GoalsService.getMine(userId: string, now?: Date): Promise<Goal | null>; // returns the active goal, or the goal reached today, else null; settles expiry first
  GoalsService.create(userId: string, input: GoalInput, now?: Date): Promise<Goal>; // ConflictError if an active goal remains after expiry is settled
  GoalsService.update(userId: string, patch: { shared?: boolean; abandon?: boolean }): Promise<Goal | null>;
  GoalsService.onMealSaved(userId: string, now?: Date): Promise<void>;
  GoalsService.celebrations(userId: string, now?: Date): Promise<Celebration[]>; // friends' shared goals reached within 48 h
  GoalsService.cheer(userId: string, goalId: string): Promise<void>;
  ```
  Validation (`goals.schemas.ts`): `streak` target 2-365 and no `windowDays`; `window` `windowDays` 2-90 and target 1..windowDays. Routes under `/api/goals`: `GET /mine`, `POST /` , `PATCH /mine`, `GET /celebrations`, `POST /:id/cheer` (204).
- Rule choices (executor's calls): `streak` progress is the longest consecutive run of logged days on or after `startDay`, capped at target; `window` progress is logged days in `[startDay, startDay + windowDays - 1]`, expired when `today` is past the window end and not reached. `title`: `Log N days in a row` / `Log M days in D`.

- [ ] **Step 1: Write failing `goalProgress` tests** (start day `2026-11-05`):
  - streak target 3, logged `[10-20..11-04]` (long prior streak), today `11-05`, no logs on/after start -> `progress 0, reached false`.
  - streak target 3, logged `[11-05, 11-06, 11-07]` -> `reached true, progress 3`.
  - streak target 3, logged `[11-05, 11-07, 11-08]` -> progress 2 (gap resets), `reached false`.
  - window 7 days target 5, logged 5 days inside -> reached; 4 days and today `11-12` -> `expired true, reached false`; 4 days and today `11-11` -> neither.
- [ ] **Step 2: Write failing service tests** (mocked repo/collaborators):
  - `create` while an active goal exists -> `ConflictError`; after the active goal's window has elapsed (settled to `expired`) -> succeeds.
  - `onMealSaved` marks reached once: first call updates with a conditional `.eq('status','active')` and notifies each friend id once with `goal_reached` only if `shared`; a second concurrent call whose conditional update affects 0 rows notifies nobody.
  - `onMealSaved` for a non-shared goal marks reached and notifies no one.
  - `celebrations` only covers current friends (a removed friend's goal is absent) and goals with `reachedAt` within 48 h of `now`; `cheeredByMe` and `cheers` computed; actor card resolved.
  - `cheer`: non-friend of the achiever -> 404; own goal -> 400; second cheer by same user -> no error, still one row (idempotent); first cheer notifies the achiever `cheer`.
  - `update({ abandon: true })` sets `abandoned`; `update({ shared: true })` only touches the caller's active goal.
- [ ] **Step 3: Run** `npm test -w backend -- goals` -> FAIL.
- [ ] **Step 4: Implement** `progress.ts` first (pure), then service and repository, then controller, routes, schemas, `index.ts`. Route tests: identity only from `req.userId`; invalid bodies (`streak` with `windowDays`, `target 1` for streak, `windowDays 91`) -> 400; unauthenticated -> 401.
- [ ] **Step 5: Run** `npm test -w backend -- goals` -> PASS; `npm run lint -w backend` clean.
- [ ] **Step 6: Commit** `feat(goals): habit goals, celebrations, cheers`.

---

### Task 7: Wire modules, meals hook, cleanup

**Files:**
- Modify: `backend/src/modules/index.ts`, `backend/src/modules/meals/{index,meals.service}.ts`, `backend/src/modules/meals/__tests__/*` as needed, `CLAUDE.md`, `AGENTS.md`, `docs/architecture.md`, `docs/PRD.md`
- Test: `backend/src/modules/meals/__tests__/meals.goals.test.ts`, `backend/src/__tests__/app.test.ts` (existing; extend)

**Interfaces:**
- Consumes: all module services. Registry order in `createModuleRouters`: `auth, profiles, nutrition, scan, streaks, notifications, friends, goals, meals, plan, feel`. Router keys: `friends`, `goals`, `notifications` (mounted automatically at `/api/<name>`).
- Produces: `MealsService` dependency `goals: Pick<GoalsService, 'onMealSaved'>`; called right after `streaks.markMealSaved` in a separate try/catch that logs `Goal check failed` and never fails the save.

- [ ] **Step 1: Write failing tests:** saving a meal calls `goals.onMealSaved(userId)` after `markMealSaved`; if `onMealSaved` throws the save still resolves with the saved meal; `app.test.ts`: `GET /api/friends/overview`, `/api/goals/mine`, `/api/notifications` each return 401 without a token.
- [ ] **Step 2: Run** `npm test -w backend` -> FAIL.
- [ ] **Step 3: Implement** the wiring and the meals hook.
- [ ] **Step 4: Docs.** Replace buddy wording with friends in `CLAUDE.md`/`AGENTS.md` (rule: "A friend sees only...") and in `docs/architecture.md`/`docs/PRD.md`; `grep -rniE 'buddy_pairs|buddy_nudges|buddy_invite|buddy_status' backend database docs` must return nothing outside migrations and old plans/specs.
- [ ] **Step 5: Run** `npm run lint && npm test && npm run build` from the repo root -> all pass.
- [ ] **Step 6: Commit** `feat(backend): wire friends, goals, notifications`.

---

### Task 8: Frontend data layer and view model

**Files:**
- Create: `frontend/src/features/social/api/{friends,goals,notifications,profile}.ts`, `frontend/src/features/social/social-view.ts`, `frontend/src/features/social/content.ts`
- Test: `frontend/src/features/social/social-view.test.ts`

**Interfaces:**
- Produces (all use `apiAuthed` from `frontend/src/shared/api/client.ts`):
  ```ts
  // api/friends.ts
  getOverview(): Promise<FriendsOverview>; searchPeople(q: string): Promise<PersonCard[]>;
  sendRequest(username: string): Promise<void>; respondRequest(userId: string, d: 'accept'|'decline'): Promise<void>;
  removeFriend(userId: string): Promise<void>; nudgeFriend(userId: string): Promise<void>;
  // api/goals.ts
  getMyGoal(): Promise<Goal | null>; createGoal(input: GoalInput): Promise<Goal>; patchGoal(p: { shared?: boolean; abandon?: boolean }): Promise<Goal | null>;
  getCelebrations(): Promise<Celebration[]>; cheer(goalId: string): Promise<void>;
  // api/notifications.ts
  getInbox(): Promise<{ items: NotificationItem[]; unread: number }>; markInboxRead(): Promise<void>;
  // api/profile.ts
  setUsername(username: string): Promise<void>;  // PUT /api/profiles/me/username
  // social-view.ts - pure
  type RowStatus = 'logged' | 'not_yet' | 'lost';
  friendStatus(row: FriendRow): RowStatus;               // logged if loggedToday; lost if !loggedToday && streak === 0; else not_yet
  canNudge(row: FriendRow): boolean;                      // status !== 'logged' && !row.nudgedToday
  groupLine(loggedCount: number, total: number): string | null; // null when total is 0; "4 of 5 friends logged today"
  goalProgressLine(g: Goal): string;                      // "5 of 7" style; streak: "2 of 3 days"
  validUsername(input: string): string | null;           // trims, lowercases, returns null unless /^[a-z0-9_]{3,20}$/
  notificationLine(n: NotificationItem): string;          // one line per kind, uses actor.username ?? actor.displayName ?? 'Someone'
  ```
  Types mirror the backend shapes in Tasks 2-6.
- [ ] **Step 1: Write failing tests** in `social-view.test.ts`: `friendStatus` for `{loggedToday:true}` -> logged, `{loggedToday:false,streak:0}` -> lost, `{loggedToday:false,streak:4}` -> not_yet; `canNudge` false when logged or already nudged; `groupLine(4,5)` -> `'4 of 5 friends logged today'`, `groupLine(0,0)` -> `null`, `groupLine(1,1)` -> `'1 of 1 friend logged today'`; `validUsername(' Ayesha_1 ')` -> `'ayesha_1'`, `'ab'` -> `null`, `'a b c'` -> `null`; `notificationLine` for each of the five kinds contains the actor name and never contains the word "meal" (privacy guard).
- [ ] **Step 2: Run** `npm test -w frontend -- social-view` -> FAIL.
- [ ] **Step 3: Implement** the files above; copy strings go in `content.ts`, estimate/advice-free wording only.
- [ ] **Step 4: Run** the same command -> PASS; `npm run build -w frontend` (tsc) clean.
- [ ] **Step 5: Commit** `feat(frontend): social api layer and view model`.

---

### Task 9: Social tab, inbox, username prompt, remove buddy

**Files:**
- Create: `frontend/app/(tabs)/social.tsx`, `frontend/app/inbox.tsx`, `frontend/src/features/social/components/{SocialScreen,FriendRow,AddFriend,GoalCard,GoalEditor,CelebrationCard,UsernamePrompt,InboxList}.tsx`, `frontend/src/features/social/useSocialData.ts`
- Modify: `frontend/app/(tabs)/_layout.tsx`, `frontend/src/shared/ui/hissa/TabBar.tsx`, `frontend/src/features/today/{TodayScreen.tsx,today-view.ts,today-view.test.ts,content.ts}`, `frontend/src/shared/auth/session.tsx`, `frontend/app/_layout.tsx`, `frontend/app/index.tsx`
- Delete: `frontend/src/features/buddy/`, `frontend/app/(tabs)/buddy.tsx`, `frontend/app/invite/[code].tsx`, `rememberInvite/getPendingInvite/clearPendingInvite` and `inviteKey` in `session.tsx` (and their callers)

**Interfaces:**
- Consumes: Task 8 api and view helpers; `HissaScreen`, `HissaText`, `PrimaryButton`, theme from `frontend/src/shared`.
- Produces: `useSocialData(): { overview; goal; celebrations; refresh(): Promise<void>; loading; error }` refreshes on screen focus, on pull-to-refresh, and every 20 s while focused (clear the timer on blur). `TabBar` shows Social (replacing Buddy) with an unread badge from `getInbox().unread`, polled every 30 s and refreshed on focus.

- [ ] **Step 1: Update `today-view.test.ts` first.** The Today card no longer depends on a buddy: replace `buddyCard` with `streakCard(status: { streak: number; loggedToday: boolean } | null)` returning `{ kind: 'streak', streak, loggedToday }` or `{ kind: 'hidden' }` for null, pointing at `/(tabs)/social`. Test both outputs. Run `npm test -w frontend -- today-view` -> FAIL, then implement in `today-view.ts` and `TodayScreen.tsx` (use `GET /api/streaks`; remove the nudge button and buddy imports).
- [ ] **Step 2: Build the Social screen.** Order top to bottom: group banner (`groupLine`), celebration cards (Cheer button, cheer count), my goal card (progress, share toggle, abandon; `GoalEditor` creates with type streak/window, target, windowDays, shared off by default), friend rows (name, flame + streak, status text, Nudge button only when `canNudge`), then Add friend (username search, 3+ chars, Send request) with incoming requests (Accept/Decline) and outgoing list, and a Remove friend action per row. Header link opens `app/inbox.tsx`, which lists `notificationLine` rows and calls `markInboxRead` on open. When `GET /api/profiles/me` has `username === null`, render `UsernamePrompt` (uses `validUsername`, shows the 409 "taken" message) instead of the tab body.
- [ ] **Step 3: Remove buddy.** Delete the files listed, fix every import (`grep -rniE "buddy|invite" frontend/app frontend/src` outside `features/landing`), and make sure `app/_layout.tsx`/`app/index.tsx` no longer read the pending invite. The landing page's marketing "Buddy" section stays untouched.
- [ ] **Step 4: Verify.** Run `npm run lint && npm run build -w frontend && npm test -w frontend` -> all pass.
- [ ] **Step 5: Manual demo run** (Expo Go on the iPhone 11 plus a simulator or browser, three Google accounts; start with `npm run dev` and `npm run dev:app`): set usernames; A requests B and C, both accept; A logs a meal and B's list shows A logged with a streak; B nudges C and C's Social tab badge and inbox show it; A creates a shared goal, reaches it, B and C see a celebration card and an inbox entry, B cheers and A's inbox shows it. Note any failure in `docs/superpowers/plans/2026-11-02-v2-status.md`-style status notes; do not claim success without having run it.
- [ ] **Step 6: Commit** `feat(frontend): social tab, inbox, goals; remove buddy`.

---

## Self-review

- **Spec coverage:** usernames (T2), friendships incl. request/mutual/decline/remove/cap/search (T5), migration of buddies and dropped invites (T1, T9), personal streak and count line (T3, T8), nudges one per day (T4 index + T5), inbox and badge (T4, T9), goals and celebrations and cheers (T6, T9), privacy whitelist (T5, T6, T8), docs wording (T7), Expo Go and no push (Global Constraints, T9 manual run).
- **Deliberate narrowing of the spec:** "edit" a goal means change sharing or abandon and start a new one; changing the target is abandon + create. A goal whose window passes unreached becomes `expired` so the user is never stuck with a dead goal.
- **Types:** `PersonCard` (T2) is reused by T4, T5, T6 and the frontend; `FriendRow`, `Goal`, `Celebration`, `NotificationItem` names match across tasks.
