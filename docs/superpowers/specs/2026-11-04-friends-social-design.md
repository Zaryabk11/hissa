# Friends: a social layer for food streaks (phase 1 of 4)

Status: draft for approval. Date: 2026-11-04.
Marked **[call]** = a decision I made, not the product owner. Everything else was said by the product owner.

## Why

Hissa v1 and v2 are done. v2 has a one-to-one "buddy" pair that shares a streak. The product owner wants the app to feel like Snapchat streaks plus a Strava-like community of health-conscious eaters: add friends, see who is keeping their food-logging streak, nudge people who slip, and celebrate when someone reaches a goal. A friendly competition among friends should keep people logging daily.

This is phase 1 of four. The order agreed is:

1. **Friends core (this document)**: usernames, friend requests, friends list with streaks, nudges, notifications, habit goals, celebrations.
2. Board: a ranking of friends and of everyone, by streak and days logged.
3. Public profiles and Following: opt-in creators who share meals; followers see them.
4. Macro targets and recipes: custom macro targets, a desi recipe set tagged by a Python script, ranking by likes and dislikes.

## The demo moment (what success looks like)

On demo day, with two or three accounts on phones:

- A logs a meal. B's friends list now shows A as "logged today" and A's streak.
- B nudges C, who has not logged. C sees the nudge in the app: an unread badge on the Social tab and an entry in the inbox.
- A reaches a shared goal. Every friend gets a celebration (notification plus a card) and can cheer it.
- The group is visibly holding each other accountable, not just reading numbers.

## Goals

- Friends are many-to-many. A user can have as many friends as the cap allows.
- Add a friend by searching a username and sending a request; the other person accepts or declines.
- A friends list showing, per friend, only: username, display name, current streak, whether they logged today.
- Nudge a friend who has not logged today.
- An in-app notification system: an inbox with an unread badge. No push notifications in phase 1 (see Demo device).
- Habit goals a user sets for themselves, with progress computed by the app and sharing with friends as an opt-in.
- A celebration when a friend reaches a shared goal, with cheers.
- The old one-to-one buddy is folded in: it becomes one friendship among many.

## Non-goals (phase 1)

Squads or named groups. Feeds, chat or comments. The Board. Public profiles and following. Macro targets and recipes. Push notifications and daily reminders. Invite links and contact import. Realtime sockets. Weight or health-outcome goals.

## Anti-goals

- A friend ever seeing meals, photos, calories, feelings or body data. Even by accident in an API response.
- Nudges becoming harassment: no unlimited nudging, nobody forced to stay in someone's list.
- Any number shown as a fact. Every number in the app stays labelled an estimate, and nothing here is medical advice.

## Privacy rules (extend the existing buddy rule to all friends)

A friend sees only: username, display name, "logged today", streak, nudge state, and a goal the user chose to share (its title and progress). Never meals, photos, calories, feelings. Clients never write friendship, goal, notification or nudge data directly to Supabase; everything goes through the API, scoped to the authenticated user (the backend uses the service role, which bypasses row-level security).

`docs/architecture.md` and `CLAUDE.md` need their buddy wording updated to "friends".

## What exists today (so the builder can reuse it)

- `backend/src/modules/streaks/`: `markMealSaved` (called when a meal saves), a shared pair streak, 6-character invite codes, one nudge per sender per day, an in-app unread flag. Pair state lives in `buddy_pairs`, `buddy_nudges`, `streak_days` (migrations `20261102000200` and `20261102000300`), with service-only SQL functions that take a global advisory lock.
- `streak_days`: one row per user per Karachi (PKT) calendar day with at least one saved meal that has a confirmed dish. It is also repaired from `meals` when status is read. Keep this definition of "logged".
- Profiles have only `display_name` today, no username. Profile `goal` is `lose` or `maintain` and is not the new habit goal.
- No push or notification code exists. Expo SDK 58, expo-router. The demo runs in Expo Go.
- Backend rules (enforced by lint): routes, controller, service, repository; modules import each other only through `index.ts`; external APIs behind injected clients.

## Design

### People and usernames

- Every user has a unique username: 3 to 20 characters, lowercase letters, digits and underscore **[call]**. Existing users must set one before they can use Social **[call]**. The column is nullable with a unique index; a migrated friend who has not picked one yet shows by display name only, and the app prompts for a username the first time Social opens **[call]**. Username is not shown anywhere a friend relationship does not exist, except in search results.
- Search: prefix match on username, at least 3 characters, at most 10 results, returning only username and display name **[call]**. Exclude self and anyone you are already connected to.

### Friendships

- Replace `buddy_pairs` with a `friendships` model: two users, who requested, status (pending, active, declined, removed), timestamps, with exactly one row per unordered pair **[call]**.
- Sending a request to someone who already sent you one accepts it **[call]**.
- Either person can remove a friend at any time. Removing ends nudges and sharing both ways. A declined or removed pair can send a new request later **[call]**.
- Friend cap per user: 50 **[call]**.
- Migration: every active `buddy_pairs` row becomes an active friendship keeping its `accepted_at`. Pending invite codes are dropped (they were short-lived), and the invite-code screens and routes are removed **[call]**. `buddy_nudges` rows are not migrated.

### Streaks

- Streak is **personal**: the count of consecutive PKT days with a saved meal, ending today or yesterday (so it does not read zero first thing in the morning) **[call]**. The old pair streak (both must log) goes away.
- The group is shown as today's count only, e.g. "4 of 5 friends logged today". There is no group-wide chain **[call]**, because one slip in a large group would end it constantly.
- Time is Karachi time (PKT) for everyone, as in v1 and v2. Per-user timezones are out of scope **[call]**.
- `streak_days` is written whenever a meal saves. The migration backfills it once from `meals` for everyone, and the friends list then reads `streak_days` directly in one batch query. The on-read repair in the old buddy status function is dropped **[call]**.

### Nudges

- A user can nudge a friend who has not logged today. One nudge per sender per recipient per PKT day **[call]**.
- A nudge creates an inbox notification for the recipient. Nothing is sent if the friend has logged by then.

### Notifications

- Inbox: a list with read and unread, an unread badge on the Social tab. It is the only delivery channel in phase 1, so it must feel live: refresh on focus and a short polling interval while the Social tab is open **[call]**.
- Push is out of phase 1 (no paid Apple Developer account). Keep a single place where a notification is created so push can be added later without touching callers **[call]**.
- Inbox events in phase 1: friend request received, request accepted, nudged, a friend reached a goal. Cheers appear in the inbox like the rest.
- No daily reminder in phase 1.

### Habit goals

- A user has at most one active goal; after one is reached or abandoned they can set a new one at once **[call]**. A goal counts only days logged on or after the day it was created, so a long existing streak does not complete it instantly; a "N days in a row" goal needs a fresh run of N days starting on or after creation **[call]**. Types for phase 1: "log N days in a row" and "log M days within the next D days" **[call]**. The user can create, edit and abandon a goal.
- Progress is computed by the backend from `streak_days`, not typed in **[call]**. (The owner said users can "update their goal status"; this is my reading: they set and change the goal, the app tracks progress honestly.)
- Sharing is opt-in per goal, off by default. Friends see the title and progress of a shared goal only.
- When a meal save pushes a goal past its target, the goal is marked reached once, and friends are told if it was shared **[call]**: a celebration card stays at the top of their friends list for 48 hours **[call]**; the event also lands in their inbox.
- Cheers: only a direct friend can cheer, once per celebration. If a friend is removed, their cheer disappears from view **[call]**; the achiever sees the cheer count and who cheered, in the inbox only.
- No goals about weight, calories or macros in this phase; macro goals arrive with phase 4.

### Screens (frontend)

- A **Social** tab in the main navigation. In phase 1 it holds only the Friends view; the Board and Following pills come in phases 2 and 3 **[call]** (no empty pills).
- Friends view top to bottom: group count banner, any celebration cards, then friend rows (name, flame and streak, "logged today" or "not yet" with a Nudge button, or "streak lost" with a Nudge button). Add friend (search by username) and pending requests live behind the row at the bottom and a badge.
- The user's own goal summary and an Update goal action sit under the banner.
- Notification inbox reachable from the Social tab.
- The existing buddy feature and its invite screens are removed.
- Refresh on screen focus and pull-to-refresh; no websockets in phase 1 **[call]**.

### Backend shape

- New modules `friends` and `goals` and `notifications`, following the module rules above; `streaks` keeps `markMealSaved` and the personal streak. A meal save notifies `goals` (to check reached) through module `index.ts` imports, never the repository.
- All new tables deny direct access from clients; the API checks that the caller is a party to any friendship or goal it touches.

## Left to the builder

Table and column names beyond those mentioned. Endpoint shapes. How to batch-read many friends' status without a per-friend query or a global lock. Whether to use SQL functions or plain repository queries. How goal edge cases behave (editing a goal midway, a goal reached while offline). Exact copy for the UI and notifications. 

## Demo device and push

The demo runs on the product owner's iPhone 11 in Expo Go, with two or three test accounts. The owner has no paid Apple Developer account, so iOS push is not possible; the owner chose the in-app inbox with an unread badge instead. Nudges and celebrations therefore show up inside the app, not as lock-screen alerts. Push becomes a later add-on (needs a paid account, device tokens, and the Expo push service behind an injected client).

## Later phases (data model must not block them)

Board (phase 2) ranks by streak and days logged, using the same streak data. Public profile and Following (phase 3) add a visibility setting and a one-way follow relation separate from friendships. Macro targets and recipes (phase 4) add target fields and a recipe set whose numbers come from our nutrition catalog, never from Gemini.
