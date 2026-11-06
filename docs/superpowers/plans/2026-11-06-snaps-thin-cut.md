# Snaps Thin Cut Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Friends-only view-once photo snaps sent from the meal-save flow, plus the friends-only streak cheer, behind `SNAPS_ENABLED` (default off).

**Architecture:** New `snaps` module (routes -> controller -> service -> repository) with a `SnapStorage` client over a private Supabase bucket injected into the service. The open call claims `snap_recipients.opened_at` with a conditional update, then returns the image bytes in the response (no URLs). An in-process interval runs `snapsService.sweep(now)`. The streak cheer is a new `cheer_streak` notification kind sent by `friends`.

**Tech Stack:** Express 5, TypeScript, zod, supabase-js (service role, Storage), sharp, vitest + supertest; Expo SDK 58, expo-router.

**Spec:** `docs/superpowers/specs/2026-11-06-snaps-follows-cheers-design.md` (phase 1 of section 13). Read it and `CLAUDE.md` first. This plan overrides nothing in it.

## Global Constraints

- Backend rules (enforced by `npm run lint`): routes -> controller -> service -> repository; modules import each other only through `index.ts`; external APIs behind injected clients; every query scoped to the caller (service role bypasses RLS). New module names go in the `modules` array of `backend/eslint.config.mjs`. Helper files (not `*.routes|controller|service|repository|client|schemas|types.ts`) are unchecked: keep them free of cross-module imports.
- New tables: RLS on, no policies, `revoke all ... from anon, authenticated`. Buckets `snaps` and `snap-reports`: `public=false`, about 500 KB limit, `image/jpeg` only, created behind `to_regclass('storage.buckets') is not null`. No signed URLs ever. Migration name sorts after `20261105000000_macro_targets.sql`.
- Limits (my call, spec section 6): snap only for a meal with `eatenAt` within 30 min; one snap per meal; 12 snaps per sender per PKT day (`pktDay`); TTL 24 h; 10 min grace after last open before the object is removed; sweep every 5 min plus at start; orphan objects removed at 25 h; snap rows hard-deleted 7 days after expiry; reported photo kept 30 days in `snap-reports`.
- Re-encode with `resizePhoto` (JPEG, 1024 px, no metadata). Open returns `Cache-Control: no-store`. Every open failure is a 404 (no oracle). The sender is never told who opened.
- Never log bytes, base64 or request bodies. Log names: `snap.created`, `snap.opened`, `snap.object_deleted`, `snap.reported`, `snap.sweep`, warn `snap.delete_failed`.
- Streak cheer: friends only; target logged today and streak >= 3; one per cheerer, target, PKT day.
- No push. No Gemini involvement. Every number shown is an estimate (no new numbers here).
- Commit step in every task: `git add <task files> .claude-logs/`, message ending with the two attribution lines from the session reminder. Do not push.

## Review Focus

Each line has its test in the owning task.

1. Web camera sends a `data:image/png;base64,...` URI, and scans may be PNG or WebP: the app strips the prefix, the server re-encodes to JPEG (Tasks 4, 9).
2. Storage download fails during open: snap is not consumed, retry works (Task 5).
3. Meal deleted after sending (`meal_id` set null): snap still opens and still expires (Tasks 3, 5).
4. A sweep run that throws, or a `remove` that fails, must not stop the timer or record a false deletion; next run retries (Tasks 2, 7).
5. Double save, a 409, offline or a failed snap send never blocks, delays or errors the meal save; no duplicate snap (Task 9).

## File Structure

- `backend/src/shared/image/index.ts` (create, moved from `scan/resize-photo.ts` and `scan.schemas.ts`): `resizePhoto`, `MAX_IMAGE_BYTES`, `imageBodySchema`.
- `backend/src/shared/jobs/index.ts` (create): `Job`, `startJobs`.
- `backend/src/modules/snaps/` (create): `snaps.{routes,controller,service,repository,schemas,types}.ts`, `snap-storage.client.ts`, `index.ts`.
- `database/supabase/migrations/20261106000000_snaps.sql` (create).
- Modify: `shared/errors`, `shared/config`, `app.ts`, `server.ts`, `modules/index.ts`, `eslint.config.mjs`, `scan` (imports), `notifications` (kind, message), `friends` (cheerStreak).
- Frontend: `src/shared/flags.ts`, `src/features/social/api/snaps.ts`, `src/features/scan/sendSnap.ts`, `src/features/social/snap-view.ts`, `app/snap/[id].tsx`, plus edits to inbox, TabBar hook, Review/Plan screens, `FriendRow`.

---

### Task 1: Rewrite the privacy rules first

**Files:** Modify `CLAUDE.md` (module list line 15, friend rule line 30, "Clients never write" and notifications bullets), `docs/PRD.md` (lines ~34, 44, 66), `docs/architecture.md` (RLS paragraph ~85), `docs/superpowers/specs/2026-11-04-friends-social-design.md` (Anti-goals bullet 1, "Privacy rules", Non-goals, cheers wording, "except custom goals"), `backend/README.md` (lines ~116, 118, 120, 502).

**Interfaces:** none (text only).

- [ ] **Step 1:** Replace each stale statement using the exact sentences in spec section 12 (CLAUDE.md friend-visibility sentence verbatim; module list gains `follows snaps`; "Clients never write" adds follow, snap, block and report data; notifications rule adds `GET /api/snaps/inbox`, still no push). In PRD/architecture add that snaps and the streak cheer are phase 1 behind `SNAPS_ENABLED`; public accounts, following, food cheers and custom goals are designed, not built. Add the "no URLs, deleted after everyone opened it or 24 h, reported photo kept 30 days" rule to the architecture RLS paragraph.
- [ ] **Step 2:** `grep -rn "never meals\|never meals, photos" CLAUDE.md docs backend/README.md` returns only lines that now carry the snap exception.
- [ ] **Step 3:** Commit `docs: rewrite friend privacy rules for snaps`.

### Task 2: Groundwork (shared image, 429, flag, job runner)

**Files:** Create `backend/src/shared/image/index.ts`, `backend/src/shared/image/__tests__/image.test.ts` (moved from `scan/__tests__/resize-photo.test.ts`), `backend/src/shared/jobs/index.ts`, `backend/src/shared/jobs/__tests__/jobs.test.ts`. Modify `scan/scan.service.ts`, `scan/scan.schemas.ts`, `scan/__tests__/scan.schemas.test.ts`, `shared/errors/index.ts`, `shared/config/index.ts` and its test, `backend/.env.example`. Delete `scan/resize-photo.ts`.

**Interfaces:**
- Produces: `resizePhoto(input: Buffer): Promise<Buffer>`; `MAX_IMAGE_BYTES = 6_000_000`; `imageBodySchema` (zod: `image` base64 string rules and `mimeType` enum exactly as today's `scanBodySchema`); `class TooManyRequestsError extends AppError` (429, `too_many_requests`); `Config.SNAPS_ENABLED: boolean`; `type Job = { name: string; everyMs: number; run: () => Promise<void> }`; `startJobs(jobs: Job[]): () => void` (runs each once now and every `everyMs`; a throw is caught and logged with `logger.error`; returns a stop function).

- [ ] **Step 1: Tests.** Existing resize and scan-schema tests keep passing from their new import paths (`scanBodySchema = imageBodySchema`, message `'image is too large'` unchanged). Config: `SNAPS_ENABLED` is `false` by default, `true` for `'true'`, `false` for `''`. Jobs (fake timers): a job that throws on the first run is called again after `everyMs`; stop function ends the timer. Errors: `new TooManyRequestsError('x').status === 429`.
- [ ] **Step 2:** Run `npm test -w backend` (new tests fail).
- [ ] **Step 3:** Move the code, update the `scan` imports, add the error, flag (`z.preprocess` so only `'true'` is true) and `startJobs`; add `SNAPS_ENABLED=false` with a comment to `backend/.env.example`.
- [ ] **Step 4:** `npm run lint -w backend && npm test -w backend` pass.
- [ ] **Step 5:** Commit `refactor: share image handling; add 429, SNAPS_ENABLED and job runner`.

### Task 3: Snap migration and database test

**Files:** Create `database/supabase/migrations/20261106000000_snaps.sql`, `backend/src/modules/snaps/__tests__/snaps.database.test.ts` (same docker/psql, rolled-back-transaction style and `describe.skipIf(!container)` as `friends.database.test.ts`).

**Interfaces:**
- Produces tables: `snaps(id, sender_id cascade, meal_id unique references meals on delete set null, object_path, created_at, expires_at, deleted_at)`; `snap_recipients(snap_id cascade, recipient_id cascade, audience in ('friend','follower') default 'friend', expires_at, opened_at, pk (snap_id, recipient_id))` with partial index `(recipient_id) where opened_at is null`; `reports(id, reporter_id, target_id, snap_id (no FK), reason in ('spam','inappropriate_photo','harassment','other'), created_at, evidence_path, evidence_expires_at, unique (reporter_id, snap_id))`. Notifications: kind check adds `cheer_streak`; day check becomes `kind not in ('nudge','cheer_streak') or day is not null`; unique index `(actor_id, user_id, day) where kind='cheer_streak'`. `meals.photo_path` dropped. Buckets `snaps`, `snap-reports`. Not in this migration: `follows`, `blocks`, profile columns, `cheer_food`, `snap_id`, goals changes.

- [ ] **Step 1: Test** (needs `HISSA_TEST_POSTGRES_CONTAINER`): second snap for one meal rejected; duplicate recipient row rejected; `cheer_streak` without day rejected, with day accepted, same actor/user/day twice rejected; `meals.photo_path` gone; deleting the meal leaves the snap with `meal_id` null; `set role authenticated` select on `snaps`, `snap_recipients`, `reports` is denied; when `storage.buckets` exists both buckets are `public=false`.
- [ ] **Step 2:** Run it against the disposable container (see `backend/README.md`); without a container it skips. Expected: FAIL (tables missing).
- [ ] **Step 3:** Write the migration. Read the real constraint names from `pg_constraint` (`notifications` kind and day checks) before `drop constraint`; use `if exists`. Guard bucket inserts with `to_regclass('storage.buckets') is not null`.
- [ ] **Step 4:** Run again: PASS.
- [ ] **Step 5:** Commit `feat(database): snaps tables, buckets and cheer_streak kind`.

### Task 4: Snaps module: send, inbox, unsend

**Files:** Create the `snaps/` files listed above plus `snaps/__tests__/{snaps.service,snaps.route}.test.ts`. Modify `eslint.config.mjs` (add `'snaps'`), `modules/index.ts`, `app.ts`, `server.ts`.

**Interfaces:**
- Consumes: `FriendsService.friendIds`, `.areFriends`; `MealsService.getMeal(userId, mealId)` (404 when not the caller's); `ProfilesService.getCards(ids)`; `resizePhoto`, `imageBodySchema`, `TooManyRequestsError`, `ConflictError`, `pktDay`, `pktDayBounds`.
- Produces `SnapStorage` (in `snaps.types.ts`): `put(path, bytes: Buffer): Promise<void>`; `get(path): Promise<Buffer | null>` (null if missing); `remove(paths: string[]): Promise<void>` (idempotent); `copyToReports(path, dest): Promise<boolean>` (false if source gone); `removeReports(paths): Promise<void>`; `listOlderThan(cutoff: Date): Promise<string[]>`. Implemented by `createSnapStorageClient(db)` over `db.storage.from('snaps' | 'snap-reports')` in `snap-storage.client.ts`, the only code touching buckets.
- Produces `createSnapsService({ repository, storage, friends, meals, profiles })` returning `send(userId, input: { mealId: string; image: string }, now = new Date()): Promise<{ id: string | null; expiresAt: string | null; recipients: { friends: number } }>`, `inbox(userId, now = new Date()): Promise<{ items: { id; sender: PersonCard; sentAt; expiresAt }[] }>` (unopened, live, newest 50, never bytes), `unsend(userId, snapId): Promise<void>`. Repository functions follow these needs and take `(callerId, ...)` first: `insertSnap`, `insertRecipients` (one bulk insert), `snapForMeal`, `countSentBetween`, `inboxFor`, `ownSnap`, `markDeleted(snapId, nowIso)` (conditional on `deleted_at is null`), `deleteRecipients`.
- Produces `createSnapsModule({ db, config, friends, meals, profiles }): { router, service, jobs: Job[] }`; `createModuleRouters` now returns `{ routers: Record<string, Router>; jobs: Job[] }`; `app.ts` mounts `routers` and stores `jobs` in `app.locals.jobs`; `server.ts` calls `startJobs(app.locals.jobs)`.
- Routes (all behind `requireAuth`): `POST /` body `imageBodySchema.extend({ mealId: z.uuid() })` -> 201; `GET /inbox`; `DELETE /:id` -> 204. When `SNAPS_ENABLED` is false the `snaps` router is not mounted (404) and `jobs` is empty. `app.ts` mounts the 8 MB JSON parser for `scan` and `snaps` and skips the 100 KB parser for both.

- [ ] **Step 1: Service tests** with an in-memory `SnapStorage` fake and fake repository (style of `friends.service.test.ts`): two friends -> 201, one object stored at `<snapId>.jpg`, two recipient rows with `expires_at = now + 24h`; no friends -> `recipients.friends === 0`, `storage.put` never called, no rows; second send for the meal -> `ConflictError`; 13th snap in a PKT day -> `TooManyRequestsError`, and a send at 00:01 PKT counts from the new day; meal not the caller's -> 404; meal eaten 31 min ago -> 400; stored bytes of a GPS-tagged JPEG have no `exif` (sharp metadata); a PNG and a WebP input are stored as JPEG (Review Focus 1); recipient list frozen at send (a friend added later has no row); `inbox` omits opened and expired rows and other users' rows, and two consecutive calls return the same items; `unsend` by a non-sender -> 404, by the sender removes the object then marks deleted and drops recipients; a storage `remove` failure in `unsend` leaves rows intact; insert race (`23505` on `meal_id`) removes the just-stored object and -> `ConflictError`.
- [ ] **Step 2: Route tests** (supertest, mocked service): auth required; bad uuid/body -> 400; `app` test: the 100 KB parser still rejects a large body on `/api/friends`, and `/api/snaps` accepts one under 8 MB; flag off -> `/api/snaps/inbox` 404.
- [ ] **Step 3:** Run `npm test -w backend -- snaps`: FAIL.
- [ ] **Step 4:** Implement the module, wiring and lint array. Stored object path is `${snapId}.jpg` with `snapId = crypto.randomUUID()` made in the service. Order: checks, recipients, `resizePhoto`, `put`, inserts.
- [ ] **Step 5:** `npm run lint -w backend && npm test -w backend` pass.
- [ ] **Step 6:** Commit `feat(snaps): send, inbox and unsend behind SNAPS_ENABLED`.

### Task 5: Open once (claim, race, expiry)

**Files:** Modify `snaps.{service,repository,controller,routes}.ts`; extend `snaps.service.test.ts`, `snaps.route.test.ts`; create `snaps/__tests__/snaps.race.test.ts`.

**Interfaces:**
- Consumes: Task 4 module; `FriendsService.areFriends`.
- Produces `open(userId, snapId, now = new Date()): Promise<{ image: string; mimeType: 'image/jpeg'; sender: PersonCard; sentAt: string; expiresAt: string }>` and repository `recipientFor(recipientId, snapId)` and `claimOpen(snapId, recipientId, nowIso): Promise<boolean>` (one conditional update: `opened_at is null and expires_at > now`, returns true only if a row changed). Route `POST /:id/open` sets `Cache-Control: no-store`, 200.
- Sequence (spec section 6): load recipient row (unopened, not expired, snap not deleted) -> re-check `areFriends(sender, me)` -> `storage.get` -> `claimOpen` (false: discard bytes) -> respond. All failures `NotFoundError`. No removal here: the sweeper removes after the grace period.

- [ ] **Step 1: Tests:** open returns base64 of the stored bytes, `snap.opened` logged without image data (spy on `logger`: no call argument contains the base64); second open by the same user -> 404; sender opening own snap, a stranger, an expired recipient row (`now` injected past `expires_at`), a deleted snap, an unfriended sender -> all the same 404 and `opened_at` unset; `storage.get` throws -> error surfaces, `opened_at` still null, a retry succeeds (Review Focus 2); meal deleted after send (meal_id null) -> still opens (Review Focus 3); route sets `no-store` and uses the caller id, ignoring any body user id. **Race test:** the in-memory repository's `claimOpen` is single-winner; run 20 parallel `open` calls for one recipient -> exactly one fulfilled, 19 `NotFoundError`; `opened_at` set once. Two recipients opening together both succeed. Add the same claim as a case in `snaps.database.test.ts` (two sequential conditional updates, second changes 0 rows).
- [ ] **Step 2:** Run: FAIL. **Step 3:** Implement. **Step 4:** Run `npm run lint -w backend && npm test -w backend`: PASS.
- [ ] **Step 5:** Commit `feat(snaps): view-once open with conditional claim`.

### Task 6: Report window

**Files:** Modify `snaps.{service,repository,controller,routes,schemas}.ts` and tests.

**Interfaces:**
- Produces `report(userId, snapId, reason, now = new Date()): Promise<void>`; schema `reason: z.enum(['spam','inappropriate_photo','harassment','other'])`; route `POST /:id/report` -> 204. Repository `insertReport(row)` (conflict on `(reporter_id, snap_id)` is ignored, so a repeat is a 204 with no new row), `recipientOpened(recipientId, snapId)`.
- Rule: caller must be a recipient who opened that snap, else 404. If the object still exists, `storage.copyToReports(path, <reportId>.jpg)` and set `evidence_path`, `evidence_expires_at = now + 30 days`; if gone, metadata only.

- [ ] **Step 1: Tests:** recipient who opened, object present -> evidence copied, expiry +30 d, `snap.reported {evidenceKept: true}`; object already gone -> row without `evidence_path`; recipient who never opened -> 404; stranger and sender -> 404; bad reason -> 400; repeat report -> one row; the original snap object is untouched.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** lint + tests PASS. **Step 5:** Commit `feat(snaps): report keeps a reported photo 30 days`.

### Task 7: Sweeper

**Files:** Create `snaps/snaps.sweeper.ts` (job factory, helper file); modify `snaps.{service,repository}.ts`, `snaps/index.ts`; extend `snaps.service.test.ts`.

**Interfaces:**
- Produces `sweep(now: Date): Promise<{ deleted: number; failed: number }>` on the service; repository `dueForRemoval(nowIso, graceIso)` (snaps with `deleted_at is null` that are expired, or have no unopened recipient and last `opened_at <= now - 10 min`; computing the second case in JS from embedded recipients is fine), `liveSnapIds(ids)`, `purgeBefore(iso)`, `evidenceDue(nowIso)`, `clearEvidence(reportId)`. `snaps.sweeper.ts` exports `createSnapsJob(service): Job` (`name: 'snaps.sweep'`, `everyMs: 300_000`, `run: () => service.sweep(new Date())`); `createSnapsModule` returns it in `jobs` only when the flag is on.
- Each due snap: `storage.remove([path])` first, then `markDeleted`; log `snap.object_deleted {snapId, reason}`; a failed remove logs warn `snap.delete_failed`, counts `failed`, leaves `deleted_at` null. Also: remove `snaps` objects older than 25 h whose id has no live row; delete `snap-reports` objects past `evidence_expires_at` and clear `evidence_path`; hard-delete snap rows 7 days after expiry. Log `snap.sweep {deleted, failed}`.

- [ ] **Step 1: Tests (deletion guarantees):** unopened snap at 24 h -> object removed, `deleted_at` set; all recipients opened -> not removed at 9 min, removed at 11 min after the last open; one recipient still unopened and unexpired -> kept; `remove` throws -> `failed: 1`, `deleted_at` null, the next sweep retries and deletes (Review Focus 4); after the sweep an `open` -> 404 even if the sweep never ran past `expires_at` (expiry enforced at read); orphan object at 26 h with no live row removed, at 20 h kept; evidence past 30 d removed and `evidence_path` cleared; rows 8 days past expiry purged; sweeping twice is a no-op; the job's `run` calls `sweep` (with `startJobs` from Task 2 it survives a throwing sweep).
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** `npm run lint -w backend && npm test -w backend` PASS. **Step 5:** Commit `feat(snaps): sweeper for expiry, grace removal and evidence`.

### Task 8: Streak cheer

**Files:** Modify `notifications/notifications.types.ts` (`'cheer_streak'` in `NotificationKind`), `notifications.service.ts`, `friends/friends.{service,controller,routes}.ts`; extend `friends.service.test.ts`, `friends.route.test.ts`, `notifications.service.test.ts`.

**Interfaces:**
- Produces `FriendsService.cheerStreak(userId: string, friendId: string, now = new Date()): Promise<void>`; route `POST /api/friends/:userId/cheer-streak` -> 204. `notifications.notify` conflict message depends on kind: `'Already nudged today'` for `nudge`, `'Already cheered today'` for `cheer_streak`.
- Rules: not active friends -> 404; target not logged today or streak < 3 -> `ValidationError` (400); repeat the same PKT day -> `ConflictError` (409, not remapped, unlike `nudge`). Notification `{ userId: friendId, kind: 'cheer_streak', actorId: userId, day: pktDay(now) }`.

- [ ] **Step 1: Tests:** friend logged with streak 3 -> one `cheer_streak` notification with the day; streak 2 -> 400; not logged -> 400; non-friend, self and a removed friend -> 404 and nothing sent; second cheer same day -> 409 `Already cheered today`; next PKT day allowed; a nudge and a cheer the same day to the same friend do not conflict; `GET /overview` friend rows still have exactly the six existing keys; route passes the caller id and ignores a body `userId`.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** lint + tests PASS. **Step 5:** Commit `feat(friends): streak cheer`.

### Task 9: App flag and sending from Review and Plan

**Files:** Create `frontend/src/shared/flags.ts`, `frontend/src/features/social/api/snaps.ts`, `frontend/src/features/scan/sendSnap.ts`, `frontend/src/features/scan/sendSnap.test.ts`. Modify `ReviewScreen.tsx` (~line 189), `PlanScreen.tsx` (~line 36), `scan/content.ts`, `frontend/.env.example`.

**Interfaces:**
- Produces `snapsEnabled: boolean` (`process.env.EXPO_PUBLIC_SNAPS_ENABLED === 'true'`); `snapBody(mealId: string, image: string, mimeType: string): { mealId; image; mimeType }` (strips a `data:<mime>;base64,` prefix and takes its mime, as `scanPhoto` does); `sendSnap(mealId: string): Promise<void>` (no-op when the flag is off or `getScan().image` is null; `POST /api/snaps`; one retry on a network or 5xx error; a 409 or 4xx is final; never throws); `getSnapInbox`, `openSnap(id)`, `reportSnap(id, reason)` in `api/snaps.ts`.
- Screens: after `saveMeal` resolves call `void sendSnap(meal.id)` (not awaited; navigation unchanged). When the flag is on and a photo exists, one line above Save: "This photo goes to your friends for one view. Hissa deletes it after everyone has opened it or after 24 hours. If someone reports it, Hissa keeps it for up to 30 days." (followers wording is added in phase 2).

- [ ] **Step 1: Tests:** `snapBody` strips a PNG data URI and returns `image/png` (Review Focus 1); plain base64 passes through; flag off -> no request; null image (manual meal) -> no request; a 5xx then success -> two calls; a 409 -> one call and no throw; offline twice -> resolves, no throw; `saveMeal` flow is not delayed (sendSnap returns a promise the screens do not await; assert by code review in the checklist, not a test).
- [ ] **Step 2:** `npm test -w frontend` FAIL. **Step 3:** Implement. **Step 4:** `npm run lint -w frontend && npm run build -w frontend && npm test -w frontend` PASS. **Step 5:** Commit `feat(frontend): send a snap after saving a meal`.

### Task 10: Inbox snaps, viewer and streak cheer button

**Files:** Create `frontend/src/features/social/snap-view.ts`, `frontend/src/features/social/snap-view.test.ts`, `frontend/app/snap/[id].tsx`, `frontend/app/snap/_layout.tsx` (Stack, as `app/meals/_layout.tsx`). Modify `app/inbox.tsx`, `social/components/InboxList.tsx` (or a new Snaps section beside it), `social/content.ts`, `social/social-view.ts`, `social/useSocialData.ts` (`useUnread`), `social/api/friends.ts`, `social/api/notifications.ts`, `FriendRow.tsx`, `SocialScreen.tsx`, `app/_layout.tsx` (register `snap`).

**Interfaces:**
- Produces in `snap-view.ts`: `snapViewReducer(state, event)` with `type SnapView = { phase: 'warn' | 'opening' | 'shown' | 'gone' | 'failed' }`, initial `{ phase: 'warn' }`, events `press | opened | gone | failed`; `snapDataUri(image: string, mimeType: string): string`; `canCheerStreak(row: FriendRow): boolean` (`loggedToday && streak >= 3`); `unreadTotal(notificationsUnread: number, snaps: number): number`. `cheerStreak(userId)` in `api/friends.ts`. `NotificationKind` gains `'cheer_streak'`; `socialContent.notification.cheer_streak = 'cheered your streak'`.
- Behavior: the inbox keeps its existing mount effect (`markInboxRead`) but Snaps come from `GET /api/snaps/inbox` and are never marked by it; each row shows sender, age, "expires in Xh" and "Open (once)" which navigates to `/snap/<id>`. The viewer shows "You can open this once" and an Open button; `openSnap` is called only from the button press (never in an effect); image kept in state as a data URI and never written to disk; 404 -> "This snap is gone."; a Report button calls `reportSnap`. No screenshot claim. All new UI (Snaps section, viewer entry, Cheer streak button, badge addition) is hidden unless `snapsEnabled`. Cheer streak sits next to Nudge when `canCheerStreak`; a 409 shows "Already cheered today".

- [ ] **Step 1: Tests:** reducer starts in `warn` and ignores `opened` until `press`; `press -> opening -> opened` is `shown`; `gone` shows gone; `snapDataUri('abc','image/jpeg')` is `data:image/jpeg;base64,abc`; `notificationLine` for `cheer_streak` reads "<name> cheered your streak"; `canCheerStreak` false at streak 2 or not logged; `unreadTotal(2, 3) === 5` and opening the inbox (notifications unread -> 0) leaves the snap count in the total.
- [ ] **Step 2:** FAIL. **Step 3:** Implement the screens against those helpers. **Step 4:** `npm run lint -w frontend && npm run build -w frontend && npm test -w frontend` PASS.
- [ ] **Step 5 (manual, shortened TTL in a dev config):** two accounts, flag on both sides: A saves a photo meal; B sees the snap, opens the inbox (snap stays), opens it once, second open shows "gone"; A cheers B's streak at 3 days; flag off hides everything.
- [ ] **Step 6:** Commit `feat(frontend): snap inbox, viewer and streak cheer`.

### Task 11: Remaining docs and final verification

**Files:** Modify `docs/architecture.md` (module list line 17, dependency sentence 63: `snaps -> friends, meals, profiles`; migration list; registry order line 117; new "Snaps" subsection: lifecycle, bucket, sweeper, flag), `backend/README.md` (snaps routes, `SNAPS_ENABLED`, test commands), `docs/PRD.md` status paragraph (line 24), `docs/superpowers/plans/2026-11-02-v2-status.md`, `frontend/.env.example`.

- [ ] **Step 1:** Write the doc updates; mark landing-site copy and landing spec section 12 as pending (see Later plans).
- [ ] **Step 2:** From the repo root: `npm run lint && npm test && npm run build`, plus the optional database tests against the disposable Postgres. Expected: all pass.
- [ ] **Step 3:** Record in the status doc the release gates: legal/store-policy check and hosted Storage backup/PITR/versioning check. Flag stays off until both are done.
- [ ] **Step 4:** Commit `docs: snaps thin cut architecture and status`.

---

## Self-review notes

- Spec coverage: phase 1 items all mapped (bucket/storage client Tasks 3-4, per-recipient view-once Task 5, EXIF Task 4, atomic claim Task 5, sweeper Task 7, flag Tasks 2/4/9/10, inbox not consumed Task 10, viewer Task 10, photo upload at save Task 9, streak cheer Task 8, report Task 6, docs Tasks 1/11).
- Gaps in the spec noted for the owner: zero-recipient response shape (`id: null`) is my choice; no unsend UI is specified (API only here); backend `cheer-streak` is not flag-gated (spec gates only snaps/follows routers); the spec says no `snap` notification kind, so "inbox kind snap" is the separate `GET /api/snaps/inbox` list.

## Later plans (out of scope here)

1. Public accounts and following (`follows` module, profile toggle 18+, bio, follower audience, block, search/profile screens, follower wording in the Review disclosure).
2. Food cheers (`POST /api/snaps/:id/cheer`, `cheer_food`, `snap_id`, `canCheer` in open response, viewer button).
3. Custom goals (goals schema, ticks, title check, goal screens).
4. Landing copy and landing spec section 12 updates (after the landing redesign plan lands and the release gates clear).
