# Snaps, public accounts, following, cheers and custom goals

Status: draft for owner review. Date: 2026-11-06. Not implemented. Written from `main` at `459b258`.

Markers: **Decision: owner** = said by the owner. **Builder note / my call** = my choice; the owner should check it. "Unverified" = I did not open or run it.

This design deliberately breaks the rule "friends never see meals, photos" (`CLAUDE.md`, PRD, architecture, friends spec, landing section 12). Section 12 lists every statement to rewrite first.

## 1. Intent

Today friends see only "logged today", a streak and a shared goal. The owner wants Snapchat plus Strava: log a meal and your people see its photo once; strangers follow public accounts; friends cheer the food, the streak and the goal; goals can be things Hissa cannot measure ("Walk after dinner"). The landing page already promises this.

## 2. Goals, non-goals, anti-goals

Goals: auto-send a view-once photo snap on each logged meal (friends, plus followers if public); private-by-default accounts with an optional public profile (bio, follower count); friend-only cheers on food, streak and goal; custom goals with a daily tick; no permanent copy of any snap photo (one exception: a reported photo, D12).

Non-goals (MVP): push; captions, comments, chat; snap opt-out; feeds, discovery, ranking; saving or resending snaps; snaps from manual (no-photo) meals; rule-based or Gemini-structured goals; a moderation back office.

Anti-goals: followers seeing goals, nudges, calories or feelings; anyone seeing calories or feelings; Gemini touching snaps (no image moderation: that would be a fourth Gemini job); promising what the app cannot deliver (for example "screenshots are blocked").

## 3. Constraints

- `CLAUDE.md` backend rules: routes -> controller -> service -> repository; modules import each other only through `index.ts`; external APIs behind injected clients; service role bypasses RLS, so scope every query in code.
- Lint knows modules from a hard-coded array in `backend/eslint.config.mjs` (`auth profiles scan nutrition plan meals streaks feel notifications friends goals recipes`). A new module must be added there and built and mounted in `backend/src/modules/index.ts` (mounted at `/api/<name>` behind `requireAuth` by `app.ts`).
- Layer rules match only `*.routes|controller|service|repository|client|schemas|types.ts`. Helper files (like `goals/progress.ts`) are unchecked; keep them free of cross-module imports.
- Backend-only migrations (RLS on, `revoke all ... from anon, authenticated`, as in `20261104000000_friends_goals_notifications.sql`). PKT time (`shared/time/pkt.ts`). No push. Nothing is deployed yet. New migration names must sort after `20261105000000_macro_targets.sql`.

## 4. Decisions

| # | Decision |
|---|---|
| D1 | Every logged meal with a photo always sends a snap; no opt-out; photo only; view-once; unopened snaps expire and are deleted at 24 h; no permanent copy; arrives via the inbox. **Decision: owner** |
| D2 | New accounts private; may go public (bio, follower count); follow needs no approval; followers see snaps and profile only and cannot cheer. **Decision: owner** |
| D3 | Only friends cheer: a received snap, the streak, a reached shared goal. **Decision: owner** |
| D4 | Custom goals: free-text title, once-a-day manual tick, shown to friends if shared. **Decision: owner** |
| D5 | Scanner unchanged; the app re-sends the photo it already holds after the meal saves (section 6). **Builder note / my call** |
| D6 | View-once is per recipient: each `snap_recipients` row has its own `opened_at`. One stored photo serves all recipients; it is deleted when every recipient has opened it, or at 24 h. **Decision: owner** (resolved) |
| D7 | The sender is not told who opened a snap. **Builder note / my call** |
| D8 | Photo bytes never leave through a URL: private bucket, no signed URLs; the open call returns the image in the API response. **Builder note / my call** |
| D9 | Public accounts need profile age 18 or more. Under-18s stay private (friends, no followers) but may still send snaps to friends. **Decision: owner** (18+ and private); under-18s sending to friends is **Builder note / my call** |
| D10 | Scope order: friends-only snaps plus streak cheer first; then public accounts and following; then food cheers; then custom goals. **Decision: owner** |
| D11 | Hosting is an always-on server plus hosted Supabase, so an in-process interval sweeper is acceptable. **Decision: owner** |
| D12 | A reported photo is the one exception to "no copy": copied at report time to a separate private bucket `snap-reports`, deleted after 30 days. Never copied otherwise. **Builder note / my call** |
| D13 | Manual meals (no photo) send no snap. **Builder note / my call** |
| D14 | The legal and store-policy gate is soft: build behind a feature flag (`SNAPS_ENABLED`, default off, backend config and an app flag); no shipped build exposes snaps, follows or the public toggle until the gate is resolved. **Builder note / my call** |

## 5. Data model

Migrations are shipped per phase (section 13); the two names below are indicative and the builder splits them: `20261106000000_public_accounts_and_snaps.sql`, `20261106000100_custom_goals_and_cheers.sql`. Phase 1 needs only the snap tables, the `snaps` bucket, the `cheer_streak` kind and the `photo_path` drop. Every new table: RLS on, no policies, grants revoked. Constraint names marked (unverified) are Postgres auto-names; read them from the database before dropping.

- **profiles**: add `is_public boolean not null default false`; `bio text check (char_length(bio) <= 160)`.
- **follows**: `follower_id`, `followee_id` (cascade), `followed_at`, `ended_at`, primary key pair, `check (follower_id <> followee_id)`, index `(followee_id) where ended_at is null`. Unfollow sets `ended_at`; refollow resets `followed_at`. Soft end so the follow rate limit cannot be dodged by churn. **Builder note / my call**
- **blocks**: `(blocker_id, blocked_id)` primary key, `created_at`. For followers only; friends use remove-friend. **Builder note / my call**
- **reports**: `id`, `reporter_id`, `target_id`, `snap_id` (no FK; snaps get purged), `reason in ('spam','inappropriate_photo','harassment','other')`, `created_at`, `evidence_path text`, `evidence_expires_at` (created_at + 30 days). `evidence_path` is set only when the report names a snap whose object still exists (D12). **Builder note / my call**
- **snaps**: `id`, `sender_id` (cascade), `meal_id unique references meals on delete set null`, `object_path` (`<snap id>.jpg`, no user id), `created_at`, `expires_at` (service sets +24 h), `deleted_at` (set only after the object is confirmed removed).
- **snap_recipients**: `snap_id` (cascade), `recipient_id` (cascade), `audience in ('friend','follower')`, `expires_at` (copy, so the open claim is a one-table conditional update), `opened_at`, primary key `(snap_id, recipient_id)`, index `(recipient_id) where opened_at is null`. The recipient list is frozen at send time; later friends or followers do not get earlier snaps. One bulk insert per snap; if a public account reaches thousands of followers, move followers to read-time visibility. **Builder note / my call**
- **meals.photo_path**: drop it. It is never read or written in `backend/src` or `frontend/src` (grep; only the v1 plan mentions it). Reusing it would tie a permanent row to a 24 h photo. **Builder note / my call**
- **notifications**: kind check adds `cheer_food`, `cheer_streak` (drop and recreate; name unverified, likely `notifications_kind_check`); add `snap_id uuid` (no FK so the cheer record outlives the snap); the day check becomes `kind not in ('nudge','cheer_streak') or day is not null`; unique indexes `(actor_id, snap_id) where kind='cheer_food'` and `(actor_id, user_id, day) where kind='cheer_streak'`, same pattern as `notifications_one_nudge_per_day`. There is no `snap` notification kind: snaps are listed from `snap_recipients`, because follower fan-out into notification rows is unbounded and `markAllRead` must not touch snaps. **Builder note / my call**
- **goals**: `type` check adds `'custom'` (name unverified); add `title text` with `check ((type='custom') = (title is not null))` and length 3 to 40. For custom, `target` = ticked days needed (2 to 60), no window, never expires, ticks need not be consecutive; the user abandons it. `goals_one_active_per_user` stays. **Builder note / my call**
- **goal_ticks**: `goal_id` (cascade), `day date`, `created_at`, primary key `(goal_id, day)` (= once per PKT day).
- **Storage buckets `snaps` and `snap-reports`**: both `public=false`, size limit 1 MB (1048576 bytes), `image/jpeg` only, created in the migration guarded by `to_regclass('storage.buckets') is not null` (the disposable test Postgres may lack the `storage` schema; unverified). No `storage.objects` policies. `database/supabase/config.toml` has bucket config commented out. `snap-reports` is read by no API route; only the owner reads it in the Supabase dashboard (no admin UI).

## 6. Snap lifecycle and photo path

**Photo path (D5).** `/api/scan` stores nothing and stays as is. The scan store (`frontend/src/features/scan/store.ts`) already holds `image` (base64). After `saveMeal` succeeds in `ReviewScreen.tsx` (~line 189) or `PlanScreen.tsx` (~line 36), the app calls `POST /api/snaps` with `mealId` and that base64, best effort, one retry, never blocking the meal. Rejected: a scan-time staging copy (second retention path, changes the scanner); `meals` calling `snaps` (cycle, since `snaps` needs `meals`). So "always sends" is enforced by the app flow, not the server. Manual meals have no photo and send nothing.

**Server checks on send:** schema-valid image; `meals.getMeal(userId, mealId)` (404 if not the caller's); meal `eatenAt` within 30 min; no snap yet for the meal; under 12 snaps today (PKT); then re-encode. **Builder note / my call** on 30 min and 12/day. No recipients: store nothing, return `recipients: 0`.

**Image handling.** Reuse `resizePhoto` (`.rotate().resize(1024).jpeg()`). sharp drops all metadata (EXIF, GPS) unless `withMetadata()` is used; add a test with a GPS-tagged JPEG asserting no `exif` in the output. **Builder note / my call**. `resizePhoto` is in `scan/` and not exported by `scan/index.ts`; move it and `MAX_IMAGE_BYTES` to `backend/src/shared/image/` (it imports only shared code). `app.ts` mounts the 8 MB JSON parser only for `scan`; add `snaps` to both conditions.

**Storage client.** `snaps/snap-storage.client.ts`: `put`, `get`, `remove` over `db.storage.from('snaps')`, injected into the service (rule 3), the only code touching the bucket.

**States.** created (row and object exist) -> delivered (recipient rows inserted) -> per recipient unopened or opened -> snap expired -> deleted.

**Open sequence** (bytes are read before the claim so a storage error does not burn the snap):
1. Load the recipient row; require unopened, not expired, snap not deleted.
2. Re-check audience: `friend` needs `friends.areFriends(sender, me)`; `follower` needs an active follow and a still-public sender. Fail = 404, so unfriending or going private cuts off unopened snaps at once.
3. Download the object.
4. Claim: `update snap_recipients set opened_at=now() where snap_id=:id and recipient_id=:me and opened_at is null and expires_at > now() returning *`. Zero rows: discard bytes, 404. This is the double-open guard.
5. Respond `200 {image(base64), mimeType, sender, audience, sentAt, expiresAt, canCheer}` with `Cache-Control: no-store`.
6. Then, once every recipient has opened it (or the snap expired), remove the object and set `deleted_at` (conditional on `deleted_at is null`; two last openers is harmless since removal is idempotent). Removal after the last open waits 10 minutes (the report window below), done by the sweeper rather than inline. **Builder note / my call**

**Report window (D12).** `POST /api/snaps/:id/report` copies the object to `snap-reports` if it still exists, and only if the caller is a recipient who opened that snap. The 10 minute grace after the last open lets a report from the viewer still find the photo. If the object is already gone, the report is metadata only. The sweeper deletes `snap-reports` objects past `evidence_expires_at` (30 days) and clears `evidence_path`.

**Guarantees.** No recipient reads a photo twice through the API. Nobody reads it after `expires_at` (every read filters in code, whatever the sweeper does). Bytes leave the `snaps` bucket within about 15 minutes of the last open (10 min grace plus one 5 min sweep) or within one sweep of expiry, while the API process runs; the sweeper also removes bucket objects older than 25 h with no live row. The only copy that outlives this is a reported photo, 30 days. Remove first, mark `deleted_at` second, so a crash retries and never records a false deletion. A response lost in transit consumes the snap. **Not guaranteed:** what a recipient's phone keeps (screenshots). **Unverified, and a release gate (not a blocker to start phase 1):** whether hosted Supabase backups, PITR or bucket versioning keep deleted Storage objects. The builder checks the hosted project's settings before any release. This is why photos are not `bytea` in Postgres (WAL and backups would keep them).

**Sender unsend:** `DELETE /api/snaps/:id` removes unopened recipients and the object at once (faces or house numbers in frame). **Builder note / my call**

**Logged** (via `shared/logger`): `snap.created {snapId, senderId, friends, followers}`, `snap.opened {snapId, viewerId}`, `snap.object_deleted {snapId, reason}`, `snap.reported {snapId, reportId, evidenceKept}`, `snap.sweep {deleted, failed}`, warning `snap.delete_failed`. Never logged: bytes, base64, request bodies (confirm the error handler logs no bodies; unverified).

**Sweeper.** No cron exists. `pg_cron` can expire rows but cannot safely delete Storage files (deleting `storage.objects` rows leaves the file). With an always-on server (D11), use an in-process `setInterval` every 5 min plus at start, calling `snapsService.sweep(now)`; conditional claims make several instances safe. A restart catches up, because the sweep selects by state, not by schedule. To keep tests timer-free, `createModuleRouters` should return `{ routers, jobs }` and `server.ts` starts `jobs`. The sweep also hard-deletes snap rows 7 days after expiry. **The sweeper always runs, whatever `SNAPS_ENABLED` says; only the routes are gated.** The deletion promises (one view, 24 hours, 30 days for a reported copy) must hold for photos stored before the flag was turned off. With the flag off and the buckets missing (migration not applied) every stage fails soft: a stage failure warns once, then logs at debug (`LOG_LEVEL=debug` to see it) while it repeats unchanged, so a 5 minute interval does not flood the log. **Builder note / my call**

## 7. API

Errors use `{error:{code,message}}`. Add `TooManyRequestsError` (429) to `shared/errors`; none exists.

**Follows and public profile** (`/api/follows`)

| Route | Result | Errors |
|---|---|---|
| `PUT /me/profile` `{isPublic?, bio?}` | `{isPublic, bio, followerCount}` | 400 no username, age < 18, bad bio |
| `GET /search?q=` | up to 10 public accounts (3+ chars) | 400 |
| `GET /profile/:username` | `{userId, username, displayName, bio, followerCount, following, isFriend}` | 404 missing, private or blocked (same answer) |
| `POST /` `{username}` | 204, idempotent | 404 as above; 400 self or 500 cap; 429 over 30 new follows per rolling hour |
| `DELETE /:userId` | 204 | 404 |
| `GET /following`, `GET /followers` | person cards | |
| `POST /followers/:userId/block`, `DELETE /blocks/:userId` | 204 | 404 |
| (follow-side) under-18 caller on `POST /`, or `PUT /me/profile` with `isPublic:true` and age < 18 | | 400 |

`GET /api/profiles/me` gains `isPublic`, `bio`. The toggle lives in `follows` (not `profiles`) because going private must end all followers and `follows` depends on `profiles`, not the reverse. Going private ends every follow; going public again starts at zero. Public requires profile `age >= 18` (**Decision: owner**; `profiles.age` allows 10+; an account with no age counts as under 18). Under-18s therefore have no followers, and by my default they cannot follow public accounts either (no stranger photos to minors), but still send and receive snaps with friends. The public profile shows username, display name, bio, follower count and no streak: a streak shows strangers a person's habits. These are **Builder note / my call**.

**Snaps** (`/api/snaps`)

| Route | Result | Errors |
|---|---|---|
| `POST /` `{mealId, image, mimeType}` | 201 `{id, expiresAt, recipients:{friends, followers}}` | 400 bad image or old meal; 404 meal; 409 already sent; 429 daily cap |
| `GET /inbox` | `{items:[{id, sender, audience, sentAt, expiresAt}]}` unopened, live, newest 50, never bytes | |
| `POST /:id/open` | see section 6 | 404 for every failure (not recipient, opened, expired, deleted, no longer friend/follower): no oracle |
| `POST /:id/cheer` | 204 | 404 not a friend-audience recipient, unopened or expired; 409 already cheered |
| `DELETE /:id` | 204 | 404 not sender |
| `POST /:id/report` `{reason}` | 204; keeps the photo 30 days if still stored (D12); from phase 2 also blocks that follower | 400 bad reason; 404 not a recipient who opened it |

Open is `POST` because it changes state and must not be prefetched or cached. The inbox screen calls `POST /api/notifications/read` on mount (`app/inbox.tsx`); snaps live in a separate list with their own state, so opening the inbox never consumes or marks a snap. Only the viewer's open call does.

**Cheers**
- Food: above; notifies the sender with `cheer_food` and `snap_id`; no photo or meal detail ("cheered your plate"). Once per snap per friend, allowed from open until `expires_at`. Followers get 404 (D2).
- Streak: `POST /api/friends/:userId/cheer-streak` -> 204. Friends only; target logged today and streak >= 3; one per cheerer, target, PKT day. 404 not friends; 400 not logged or streak < 3; 409 repeat. Template: `nudge`. Behind `SNAPS_ENABLED`: the route is not registered when the flag is off (404); the other friends routes are unaffected. **Builder note / my call** on the 3.
- Goal: unchanged (`goal_cheers`).
- `NotificationsService.notify` maps any unique violation to "Already nudged today"; make the message depend on `kind`.

**Goals:** `POST /api/goals` adds `{type:'custom', title, target, shared}` (strict). `POST /api/goals/mine/tick` -> `Goal`; 404 no active custom goal; 409 already ticked today. `Goal` gains `title`, `tickedToday`. Reached = ticks >= target -> existing `reach()` (celebration, friend notices, goal cheers). Custom goals ignore meal logs.

**Title and bio check** (`goals/goal-title.ts`): trim, 3 to 40 chars; letters of any script (Urdu included), digits, space, apostrophe, comma, hyphen; no `. : / @` (links, handles); a denylist rejects weight, calorie, macro, diet, medical and profanity words (English and Roman Urdu; the owner reviews the lists) and digit runs of 5+. It follows `isSafeWording` in `feel/question-bank.ts` in spirit but must be a denylist, since free text cannot be an allowlist. A speed bump only. Titles reach friends only. Bios (strangers see them) use the same check plus `. ! ?` and the report path. **Builder note / my call**

## 8. Module changes

New: `follows` (`-> profiles, notifications`), `snaps` (`-> friends, follows, meals, notifications, profiles` + storage client). Registry order: both after `meals`. `meals` does not import `snaps`: no cycle.

| Module | Change |
|---|---|
| `shared` | `TooManyRequestsError`; `image/` (moved); `app.ts` parser condition; `server.ts` starts jobs; config `SNAPS_ENABLED` (default false: the `snaps` and `follows` routers answer 404 when off; the sweep job always runs, see Sweeper) |
| `profiles` | columns in repo and types; `Profile.isPublic/bio`; service `setPublicFields`, `getPublicProfile`, `searchPublic`, `publicIds`; `index.ts` exports `PublicProfile` |
| `follows` | full module (phase 2); exports `FollowsService` with `followerIds`, `isFollowing`, `followerCount` |
| `snaps` | full module plus `snap-storage.client.ts`, `snaps.sweeper.ts` |
| `notifications` | kinds, `snapId` on `NewNotification`, per-kind conflict message, `GoalType` + `'custom'`, `formatGoalTitle(..., title?)`, `goalsByIds` selects `title` |
| `friends` | `cheerStreak` in service, controller, routes |
| `goals` | types, schemas, repo (`insertTick`, `tickDays`, `title`), service `tick`; `current()` and `friendGoals()` use ticks for custom; `progress.ts` custom branch |
| `scan` | import `resizePhoto` from shared; behaviour unchanged |
| `meals`, `streaks` | none |
| lint and registry | add `'follows'`, `'snaps'` to `eslint.config.mjs` and `modules/index.ts` |

Existing calls reused: `friends.friendIds`, `friends.areFriends`, `meals.getMeal`, `profiles.getCards`, `notifications.notify`.

## 9. Frontend

- **Inbox** (`app/inbox.tsx`, `social/api/notifications.ts`, `InboxList.tsx`): Snaps section from `GET /api/snaps/inbox` (new `social/api/snaps.ts`) with sender, age, "expires in Xh", "Open (once)". New lines for `cheer_food`, `cheer_streak` in `socialContent.notification` / `notificationLine`. The badge (`pokeUnread`, `useSocialData`) adds unopened snaps.
- **Viewer** (new `app/snap/[id].tsx`): warning "You can open this once" and an explicit Open button; the open call fires on press, never on mount; image held in state as a `data:` URI, never written to disk; food-cheer button when `canCheer`; 404 shows "This snap is gone." No screenshot claim.
- **Feature flag:** an app flag (`EXPO_PUBLIC_SNAPS_ENABLED`, default off) hides every snap, follow, public-profile and new-cheer UI element; the streak cheer button is behind the same flag.
- **Review and Plan screens**: shared `sendSnap(mealId)` after `saveMeal`; one line above Save when a photo exists: "This photo goes to your friends (and followers) for one view. Hissa deletes it after everyone has opened it or after 24 hours. If someone reports it, Hissa keeps it for up to 30 days."
- **Social tab** (`SocialScreen.tsx`, `FriendRow.tsx`): "Cheer streak" next to Nudge; Following list, find public accounts, followers list with Block and Report.
- **Public profile** (new `app/people/[username].tsx`): bio, count, Follow/Unfollow, Report.
- **Profile** (`ProfileScreen.tsx`, `content.ts`): Public profile section: toggle, bio (160 counter), follower count; confirm before going private; disabled under 18.
- **Goals** (`GoalEditor.tsx`, `GoalCard.tsx`, `api/goals.ts`, `social-view.ts`): third type "My own goal" (title, days), "Tick today" disabled once ticked.

## 10. Privacy and abuse

| Risk | Handling |
|---|---|
| Strangers get food photos | Only from public accounts they chose to follow; private default; unfollow, block, report |
| Faces, homes, EXIF | EXIF stripped (tested); faces cannot be detected; disclosure line on Review; unsend. No opt-out, so that line is the only consent point |
| Non-food images | Needs a real, recent, confirmed-dish meal, one per meal, 12/day; content not inspected (R1) |
| Service role bypasses RLS | Every snap query carries the caller id (`recipient_id`, `sender_id`, `opened_at is null`, `expires_at > now()`); tests assert a stranger gets 404 per route; RLS and revoked grants as second wall |
| URLs and CDN caching | None created; private bucket; `no-store` |
| Double open | Conditional claim; race test |
| Unfriend or go private after send | Open re-checks audience |
| Enumeration | Public-only search; private, missing and blocking accounts give the same 404 (existing friend search still lists all usernames, unchanged) |
| Follow and report spam | 30/h, 500 cap, dedupe per reporter/target/snap |
| Minors | Public requires 18+; under-18s have no followers and (default) follow no one |
| Moderation | A reported photo is kept 30 days in `snap-reports` for the owner to review; unreported photos are never kept; if the photo is already deleted a report is metadata only (R1) |

## 11. Testing

- **Unit, injected storage** (`snaps.service.test.ts`, in-memory `SnapStorage` fake, like `friends.service.test.ts`): report copies the object only for a recipient who opened it and the sweeper deletes it after 30 days; under-18 cannot go public; flag off gives 404; fan-out audiences; private sends friends only; no recipients stores nothing; second send 409; cap; wrong meal 404; output has no EXIF; open once then 404; expired 404; unfriended or went-private 404; last open removes the object; `remove` failure leaves `deleted_at` null and the sweep retries; sweep removes expired and 25 h orphans; cheer rules (friend only, after open, once, follower 404).
- **Race test:** N parallel opens by one recipient -> exactly one 200, `opened_at` set once, object removed once; two last recipients opening together -> removal happens, no error.
- **DB tests** (optional disposable Postgres, `--no-file-parallelism`, replay in a rolled-back transaction as `friends.database.test.ts` does): unique `meal_id`; recipient primary key; new kinds accepted; second tick same day rejected; RLS denies `authenticated`.
- **Route tests** (supertest): auth, validation, codes, `no-store`, big parser only on `/api/snaps`.
- **Privacy tests:** friend, goal and follow responses contain no photo or snap fields; no log call receives image data.
- **Goals:** `progress.test.ts` custom cases; double tick; tick across PKT midnight with injected `now`; title cases (links, digits, denylist, Urdu allowed).
- **Frontend:** pure-function tests (`notificationLine`, `goalInput`); viewer does not open on mount. Manual two-account run with a shortened TTL is still needed.

## 12. Documents to rewrite (this task edits none)

**`CLAUDE.md`**
- Module list gains `follows snaps`.
- Friend-visibility rule becomes: "A friend sees only username, display name, 'logged today', the streak, nudge state, a goal the user chose to share, and the view-once snap photo of each logged meal; never calories, meal details or feelings. A follower of a public account sees only that account's snaps, username, display name, bio and follower count. Accounts are private by default and only friends cheer. Snap photos live only in the private `snaps` bucket, are returned only by `POST /api/snaps/:id/open` (no URLs), are deleted once every recipient has opened them or after 24 hours, and are never logged. The one exception is a photo someone reports: it is kept up to 30 days in a separate private bucket for review. Under-18s cannot have a public account. Gemini never sees snaps."
- "Clients never write ..." adds follow, snap, block and report data. Notifications rule adds: snaps are listed at `GET /api/snaps/inbox`; still no push.

**`docs/PRD.md`:** the module 2 text (line ~66) and the diagram nodes (lines ~34, 44) replace "never meals, photos or calories" with the sentence above; add public accounts, following, snaps, three cheers, custom goals. Status paragraph (line 24) once built.

**`docs/architecture.md`:** module list (17); dependency sentence (63) adds `follows -> profiles, notifications`, `snaps -> friends, follows, meals, notifications, profiles`; RLS paragraph (85) gets the snap exception and no-URL rule; migration list (89 to 102); registry order (117); new Snaps subsection (lifecycle, bucket, sweeper).

**`2026-11-04-friends-social-design.md`:** Anti-goals bullet 1 and "Privacy rules" (superseded by this doc); remove "Public profiles and following" from non-goals and point "Later phases" item 3 here; cheers become once per celebration, per snap per friend, per friend per streak day; "progress is computed from `streak_days`" gains "except custom goals".

**Also:** `backend/README.md` lines 116, 118, 120, 502; the status doc map; landing spec section 12 items 1 to 3 -> "designed in this document".

**Landing copy** (spec lines 329 and 463, plus the built site's strings)
- Buddy body, replacing "Cheer streaks, nudge gently. Friends see you logged, never what you ate.": "Cheer streaks, nudge gently. Every meal you log sends your friends a photo that disappears after one view."
- FAQ 3, replacing "Never your meals, photos, calories or feelings.": "What can my friends see? Your username, display name, whether you logged today, your streak, nudge status, a goal if you choose to share it, and a photo of each meal you log, which they can open once. Hissa deletes the photo once everyone has opened it or after 24 hours (if someone reports it, we keep that photo for up to 30 days). They never see your calories or how you felt. New accounts are private; if you go public, your followers see your photos and bio, nothing else. Nudges and cheers land in the app's inbox. There is no push."
- "Do you keep my photos?" returns only after landing section 9 item 11 is verified: "Plate photos from scanning are not stored. Snap photos are deleted after one view or 24 hours, unless someone reports one."
- "Bilal cheered your plate" and "Walk after dinner, 4 of 5 days" become true. "Ayesha logged lunch" names a meal slot Hissa does not store: owner decides.

## 13. Phasing

Order is **Decision: owner** (D10): a thin cut first, then the rest in sequence.

0. **Gate and groundwork.** Owner approves section 12 and the open questions in section 15; move `resizePhoto`; `TooManyRequestsError`; `SNAPS_ENABLED` flag (D14). The legal and store-policy check (R1) is a soft gate: building starts now behind the flag, and nothing is exposed in any shipped build until it is resolved. The Storage backup/PITR/versioning check is a release gate, not a blocker to start.
1. **Thin cut: friends-only snaps plus the streak cheer.** `snaps` module (storage client, sweeper, inbox list, viewer, send from Review and Plan, unsend, report window) and `friends` `cheer-streak` with the `cheer_streak` kind. Friends-only keeps abuse to people who accepted each other. No `follows`, no public toggle, no food cheer, no custom goals.  Reports ship here as `POST /api/snaps/:id/report`.
2. **Public accounts and following.** `follows` module, profile toggle (18+), bio, follower audience in snaps, block, report, search and profile screens. Needs 1.
3. **Food cheers.** `POST /api/snaps/:id/cheer`, `cheer_food` kind, viewer button. Needs 1.
4. **Custom goals.** `goals`, notification title text, goal screens. Independent of 1 to 3 but last.

## 14. Left to the builder

Exact table, index and constraint names; supabase-js filters versus one SQL function for the claim; denylist word lists; copy; the numeric limits marked my call; how `jobs` is plumbed; viewer image component (`expo-screen-capture` is not in `frontend/package.json`; screenshot prevention is optional and unverified in Expo Go).

## 15. Risks and owner questions

- **R1. Moderation and legal.** Anyone can send any image to friends and, if public, followers. Hissa can review only a reported photo that was still in the bucket at report time (D12), kept 30 days; anything else is metadata only. App stores require report/block and action on reports for user-generated images; laws on illegal imagery may apply. Mitigated, not solved: private default, 18+ public, block/report, caps. Keeping reported photos is itself a retention and legal question (illegal imagery may carry reporting duties). Get a legal and store-policy check before any shipped build; until then the flag stays off.
- **R2. The privacy promise flips, with no opt-out.** Every photographed meal goes out, faces and homes included, and profile age allows 10+ (under-18s send to friends only). Consent is one notice line; the only regret tool is unsend.
- **R3. "Deleted after one view" holds only on our servers** (screenshots), and per person, not per photo (D6). Storage backup behaviour is unverified (release gate). The sweeper needs the always-on process (D11).

Owner answers (2026-11-06), all applied above:
1. View-once is per recipient (D6). Answered.
2. Scope order: friends-only snaps plus streak cheer first (D10). Answered.
3. Always-on server and hosted Supabase; in-process sweeper accepted (D11). Answered. The backup check stays a release gate.
4. Public accounts 18+ only; under-18s stay private, friends but no followers (D9). Answered.

Settled by my calls (owner may overrule): reported photo kept 30 days in `snap-reports` (D12); manual meals send no snap (D13); no streak on public profiles; legal/store gate is soft behind a flag (D14); under-18s may send snaps to friends but follow no one.

Still open (default applies until answered):
- Are 30 new follows per hour and a 500 following cap right, and should accounts have a follower cap? (default: as written)
- Should going private remove existing followers? (default: yes)
- Should under-18s be allowed to follow public accounts? (default: no)
