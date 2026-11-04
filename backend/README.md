# Hissa backend

Express 5 + TypeScript API for Hissa, the portion coach for desi households. It scans a photo of a meal, names dishes from our catalog, fits portions to the user's remaining daily calorie budget, and logs meals. Calories always come from the catalog, never from Gemini. See `docs/PRD.md` and `docs/architecture.md`.

## Run it

From the repo root:

1. `npm install`
2. `cp backend/.env.example backend/.env` and fill in the values. Never commit `.env`.
3. Set up Supabase (once), from `database/`:
   - Hosted: `supabase link --project-ref <ref>`, then `supabase db push --linked --include-seed`.
   - Local: `supabase --workdir database start`, then `supabase --workdir database db reset`. Verified with CLI 2.122 (all migrations and the seed apply; the v2 two-account smoke test passes against it). On a Mac where Docker's credential helper breaks image pulls, use a temporary `DOCKER_CONFIG` directory containing `{}`, and start with `-x logflare,vector,studio,edge-runtime,imgproxy,postgres-meta` if analytics containers fail their health checks.
4. `npm run dev` starts the API on `PORT` (default 3000).

| Command             | What it does                                   |
| ------------------- | ---------------------------------------------- |
| `npm run dev`       | Backend with reload                            |
| `npm test`          | Backend unit and route tests                   |
| `npm run test:data` | Catalog and seed-builder tests                 |
| `npm run lint`      | ESLint (architecture rules) and `tsc --noEmit` |
| `npm run build`     | Compile to `backend/dist`                      |

Regenerate the catalog seed with `node database/scripts/build-seed.mjs`.

### Environment

| Variable                    | Default                    | Notes                                             |
| --------------------------- | -------------------------- | ------------------------------------------------- |
| `PORT`                      | `3000`                     |                                                   |
| `SUPABASE_URL`              | required                   |                                                   |
| `SUPABASE_ANON_KEY`         | required                   |                                                   |
| `SUPABASE_SERVICE_ROLE_KEY` | required                   | Server only. Bypasses RLS.                        |
| `GEMINI_API_KEY`            | required                   | Server only.                                      |
| `GEMINI_MODEL`              | `gemini-flash-lite-latest` | Empty value uses default                          |
| `GEMINI_TIMEOUT_MS`         | `10000`                    | Gemini timeout per attempt (ms), up to 3 attempts |
| `SCAN_DAILY_CAP`            | `10`                       | Scans per user per PKT day                        |
| `DEMO_USER_ID`              | empty                      | Optional demo-only user id (see Demo history)     |

The server refuses to start if a required variable is missing. `DEMO_USER_ID` is optional: only that user's weekly card may have `isSample: true`; leave it empty in production.

## Conventions

- Base path `/api`. JSON in, JSON out. Body limit 100 kb, except `POST /api/scan` (8 MB, parsed after auth).
- Auth: every route except `GET /api/health` needs `Authorization: Bearer <Supabase access token>` (the session token from Supabase Auth in the app). Missing or invalid token gives 401.
- Errors always look like this:

```json
{ "error": { "code": "validation_error", "message": "image is too large" } }
```

| Status | `code`              | When                                                              |
| ------ | ------------------- | ----------------------------------------------------------------- |
| 400    | `validation_error`  | Bad body, unreadable image, meal with no confirmed dish           |
| 400    | `bad_request`       | Malformed JSON                                                    |
| 401    | `unauthorized`      | Missing or rejected bearer token                                  |
| 503    | `auth_unavailable`  | Supabase Auth unreachable, rate limiting or returned 5xx          |
| 404    | `not_found`         | Unknown route, unknown dish slug, `GET /profiles/me` before setup |
| 413    | `payload_too_large` | Body over its limit                                               |
| 501    | `not_implemented`   | Unbuilt routes (none at the moment)                               |
| 500    | `internal_error`    | Anything unexpected                                               |

## Endpoints

| Method | Path                                 | Purpose                                           |
| ------ | ------------------------------------ | ------------------------------------------------- |
| GET    | `/api/health`                        | Liveness. No auth.                                |
| GET    | `/api/profiles/me`                   | Read profile and daily calorie budget             |
| PUT    | `/api/profiles/me`                   | Create or update profile (budget is recomputed)   |
| GET    | `/api/nutrition/catalog`             | All dishes the app can name                       |
| POST   | `/api/scan`                          | Photo in, detected dishes out                     |
| POST   | `/api/plan`                          | Fit confirmed dishes to the remaining budget      |
| POST   | `/api/meals`                         | Save a confirmed meal                             |
| GET    | `/api/meals/today`                   | Today's meals and total (PKT day)                 |
| GET    | `/api/meals/week`                    | Estimated calories and meal count for the last 7 PKT days |
| GET    | `/api/meals/history?days=14`         | Meals grouped by PKT day, newest day first        |
| GET    | `/api/meals/:id`                     | One of the caller's meals                         |
| PATCH  | `/api/meals/:id`                     | Replace a meal's items (totals recomputed)        |
| DELETE | `/api/meals/:id`                     | Delete a meal: 204                                |
| GET    | `/api/auth`                          | The authenticated user: `{ "id": "<user id>" }`   |
| GET    | `/api/streaks`                       | Caller's own `{ streak, loggedToday }`            |
| PUT    | `/api/profiles/me/username`          | Set the caller's username (3-20 of `a-z0-9_`)     |
| GET    | `/api/friends/overview`              | Friends, logged count, incoming and outgoing requests |
| GET    | `/api/friends/search?q=`             | Find users by username (3+ characters)            |
| POST   | `/api/friends/requests`              | Request a friend `{ username }`: 204              |
| POST   | `/api/friends/requests/:userId/accept`  | Accept a request: 204                          |
| POST   | `/api/friends/requests/:userId/decline` | Decline a request: 204                         |
| DELETE | `/api/friends/:userId`               | Remove a friend: 204                              |
| POST   | `/api/friends/:userId/nudge`         | Nudge a friend who has not logged (once per day): 204 |
| GET    | `/api/goals/mine`                    | The caller's goal, or `null`                      |
| POST   | `/api/goals`                         | Create the one active goal: 201                   |
| PATCH  | `/api/goals/mine`                    | Share or unshare it, or abandon it                |
| GET    | `/api/goals/celebrations`            | Friends' reached goals with cheer counts          |
| GET    | `/api/goals/friends`                 | Friends' shared active goals with progress        |
| POST   | `/api/goals/:id/cheer`               | Cheer a friend's reached goal: 204                |
| GET    | `/api/notifications`                 | Inbox `{ items, unread }` (no push)               |
| POST   | `/api/notifications/read`            | Mark the inbox read: 204                          |
| GET    | `/api/feel/due`                      | The meal waiting for a check-in, or `null`        |
| GET    | `/api/feel/question/:mealId`         | The follow-up question for a due meal             |
| GET    | `/api/feel/pattern`                  | The caller's weekly pattern card                  |
| POST   | `/api/feel/checkins`                 | Save a check-in: 201 `{ id }`                     |
| POST   | `/api/feel/experiments`              | Save one private "try next time" choice: 201      |
| GET    | `/api/feel/experiments/current`      | The caller's newest choice, or `null`             |
| POST   | `/api/feel/experiments/:id/tried`    | Mark it tried with a later meal: 200              |
| GET    | `/api/profiles/me/avoids`            | The caller's avoid list: `{ proteins, dishes }`   |
| PUT    | `/api/profiles/me/avoids`            | Replace the avoid list, returns it                |
| GET    | `/api/recipes`                       | Ranked recipes for the caller                     |
| GET    | `/api/recipes/:id`                   | One recipe with ingredients and steps             |
| POST   | `/api/recipes/:id/not-for-me`        | Hide a recipe from the caller: 204                |
| DELETE | `/api/recipes/:id/not-for-me`        | Undo it: 204                                      |

### Friends, goals and notifications

`GET /api/streaks` returns exactly `{ "streak": 0, "loggedToday": false }` for the caller. A day counts when a person saved a meal (the meal save marks it); the streak is the run of consecutive PKT days ending today, or yesterday while today is still in progress.

`GET /api/friends/overview` returns `{ friends, loggedCount, incoming, outgoing }`. Each friend is exactly `userId`, `username`, `displayName`, `streak`, `loggedToday` and `nudgedToday`; nothing about meals, photos, calories or feelings. Requests, accepting a request that is not yours, adding yourself, a repeated request, nudging a friend who already logged (or nudging twice in a day) and exceeding the friend cap return 400 or 404 in the usual error shape.

One goal is active per user: `{ "type": "streak", "target": 7, "shared": true }` or `{ "type": "window", "windowDays": 14, "target": 10, "shared": false }`. A friend sees a goal only while its owner has shared it. A meal save checks the goal after the streak mark; a failed check never fails the save.

Notifications are inbox-only (kinds `friend_request`, `request_accepted`, `nudge`, `goal_reached`, `cheer`); there is no push.

### Food and Feel

- `GET /api/feel/due` returns `{ "mealId", "eatenAt", "dishes": ["Chicken karahi", ...] }` for the caller's oldest meal that is 90 minutes to 24 hours old, has a confirmed dish and no check-in, else JSON `null`. Optional `?skip=id,id` skips meals the user dismissed on screen.
- `GET /api/feel/question/:mealId` returns the follow-up question for one of the caller's due meals (same rule as `/due`: 90 minutes to 24 hours old, a confirmed dish, no check-in):

  ```json
  {
    "mealId": "<uuid>",
    "intent": "symptom_detail",
    "text": "How would you describe your stomach discomfort?",
    "options": [
      { "id": "bloated", "label": "Bloated" },
      { "id": "upset", "label": "Upset" },
      { "id": "other", "label": "Other" },
      { "id": "not_sure", "label": "Not sure" }
    ],
    "source": "gemini"
  }
  ```

  `intent` is `symptom_detail` (options `bloated|upset|other|not_sure`) unless the query is `?stomach=heavy&after=symptom_detail` (the app has a heavy stomach and the symptom step answered). Then `intent` is `pre_existing` (options `yes|no|not_sure`, text "Did you already feel this way before this meal?", `source: fallback`, never sent to Gemini) if the caller has no stored `pre_existing` answer from the last 14 days, else `symptom_detail` as usual. Options, labels and their order always come from the server, never from Gemini. `source` is `gemini` when Gemini's wording passed the checks, else `fallback` (timeout, invalid JSON, wrong option ids, a word outside the allowed vocabulary, or the history could not be read) and `text` is the fixed question. The wording guard is an allowlist of words; it checks vocabulary and shape, not meaning. Gemini is sent only the intent, the allowed ids and an aggregate summary of the caller's own check-ins (the check-in count, and whether a dish repeats with its exposed and comparison meal counts; no dish names, meal history or friend data). The client makes at most 2 attempts inside an 8 s overall deadline, so a request waits at most about 8 s (normally 1 to 3 s). The answer for a user and meal is cached for 10 minutes in the API process (at most 500 entries), so repeating the request does not call Gemini again. 400 for a malformed meal id or a meal that is not due or already answered; 404 for a meal that is not the caller's. The answer is submitted with `POST /api/feel/checkins` (`symptom` accepts the `symptom_detail` ids; the `pre_existing` answer goes in `questionType` and `answerId`).

- `GET /api/feel/pattern` returns the caller's private weekly card for the last 7 PKT days (today and the 6 days before). It takes no parameters; the user is always the token's user, and a `userId` in the request is ignored. The week is keyed on when each **meal was eaten** (`eatenAt`), not when it was checked in, and check-ins made over 24 hours after their meal do not count. Response (always 200):

  ```json
  {
    "state": "insufficient_data | no_pattern | question | pattern",
    "isSample": false,
    "checkins": 7,
    "needed": 7,
    "window": { "from": "2026-10-28", "to": "2026-11-03" },
    "pattern": {
      "patternKey": "category:rice:heavy",
      "kind": "category | dish",
      "subject": "rice",
      "outcome": "heavy | good_energy",
      "matching": 5,
      "relevant": 6,
      "comparison": null
    },
    "label": "In your logs, you reported a heavy stomach after 5 of 6 meals containing rice dishes. This only describes your own logs."
  }
  ```

  `pattern` is `null` unless `state` is `pattern` or `question`. `comparison` is `{ "matching", "total" }` (meals without the dish) for `kind: "dish"` and `null` for a category. `state` rules: fewer than 7 check-ins in the window gives `insufficient_data` (progress text in `label`); a category needs at least 3 relevant meals with the outcome in 60% or more; a dish also needs at least 3 meals without it and a gap of 25 points or more, otherwise a consistent-looking dish is a `question`; `no_pattern` means 7 or more check-ins and nothing consistent. `isSample` is `true` only for the user whose id equals the backend's optional `DEMO_USER_ID`; every other user always gets `false`. `label` states what the logs show; it never claims a cause.

- `POST /api/feel/checkins` body: `{ "mealId": "<uuid>", "energy": "low|okay|good", "stomach": "heavy|fine|light", "symptom": "bloated|upset|other|not_sure" }` (`symptom` optional; the app offers it after a heavy stomach). It may also carry `"questionType": "pre_existing"` with `"answerId": "yes|no|not_sure"`: both or neither, nothing else is accepted (400). They are stored in `question_type`, `answer_id` and `question_source` (`fallback`). A meal answered `yes` is left out of the weekly pattern and the per-user model (`no` and `not_sure` change nothing); the answer is private to its owner (never in friend data or logs). The body is strict: unknown fields give 400. 400 also for a meal that is not due, already answered, or not the caller's (404). Skipping a check-in writes nothing.

- **Try next time (experiments).** One private choice per user, saved from the caller's own weekly card. Nothing here is shown to a friend, and it never claims a cause. Every endpoint uses the token's user only. Errors use the usual `{ "error": { "code", "message" } }` shape. Experiment shape:

  ```json
  {
    "id": "<uuid>",
    "patternKey": "category:rice:heavy",
    "action": "smaller_portion | different_side | observe_again",
    "status": "active | tried",
    "createdAt": "2026-11-03T08:00:00.000Z",
    "triedAt": null,
    "tried": null
  }
  ```

  `tried` is `null` while active. Once tried it is `{ "mealId", "energy": "low|okay|good|null", "stomach": "heavy|fine|light|null" }`, taken from the caller's own check-in for that meal (`null` while there is none), so the app can show how a later meal felt. It is for review only and says nothing about cause.
  - `POST /api/feel/experiments` body `{ "patternKey": string, "action": "smaller_portion|different_side|observe_again" }` (strict) gives 201 `{ "experiment": Experiment }`. `patternKey` must equal the `pattern.patternKey` of the caller's own **current** weekly card (state `pattern` or `question`), recomputed from their own check-ins; anything else is **400** `validation_error`. **409** `conflict` while the caller already has an `active` experiment (a tried one does not block a new one).
  - `GET /api/feel/experiments/current` gives 200 `{ "experiment": Experiment | null }`: the caller's newest experiment, active or tried.
  - `POST /api/feel/experiments/:id/tried` body `{ "mealId": "<uuid>" }` (strict) gives 200 `{ "experiment": Experiment }`. **404** when the id is not the caller's. **400** `validation_error` when the meal is not the caller's own or was not saved after the experiment was created (`meals.created_at` strictly later). **409** `conflict` when it is already tried (the first meal is kept).
  - Validation errors in this API are 400, not 422.

- **Demo history (sample data only).** `node database/scripts/seed-demo-history.mjs [--dry-run]` with `DEMO_USER_ID`, `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the environment seeds 14 days of invented meals (2 a day) with one check-in each for that one existing demo-only user, so the weekly card shows `category:rice:heavy`. It refuses to run without a UUID `DEMO_USER_ID`, never creates users or credentials, reads the service key from the environment only, writes nothing for any other user, and is repeatable (row ids are derived from the user id, so a re-run updates in place; run it again on the day of a demo to move the dates forward). Set the same id as `DEMO_USER_ID` on the backend so the card carries `isSample: true`. The app must label it as sample data.

### Avoid list and recipes (v3)

`PUT /api/profiles/me/avoids` takes `{ "proteins": ["beef" | "mutton" | "chicken" | "fish" | "egg" | "veg"], "dishes": ["<dish slug>"] }` (at most 6 and 100) and replaces the whole list; `GET` returns the same shape. The list is a hard filter for recipes; on scan it only flags dishes. It is a taste or belief choice, never a medical or allergy mode. Each `ScanItem` from `POST /api/scan` carries `avoided: boolean` (the dish matches the list; the app shows "You avoid this" and still lets the user keep it).

`GET /api/recipes` returns `{ recipes: RecipeCard[], remainingCalories, isEstimate: true }`. A card has `id, slug, title, dish, dishName, proteinType, minutes, servings, unit, kcalPerUnit, isEstimate: true`. Only recipes with `reviewed = true` are served, so the list is empty until a human reviews the drafts in `database/data/recipes.json`. Avoided and not-for-me recipes are left out; the rest are ranked by fit to the remaining budget, the weekly "heavy" pattern and dishes the user eats often (see `modules/recipes/rank.ts`). It needs a profile (404 "Set up your profile first" otherwise). `GET /api/recipes/:id` adds `ingredients` (`{ item, quantity }`), `steps`, `notForMe` and `avoided`; an unknown or unreviewed id is 404. Recipes are drafted offline by `backend/scripts/draft-recipes.ts` (Gemini, never at request time).

### GET /api/health

```json
{ "status": "ok" }
```

### PUT /api/profiles/me

Request (all fields required except `displayName`). Do not send a budget: the server computes it (Mifflin-St Jeor) and ignores any client value.

```json
{
  "displayName": "Ayesha",
  "goal": "maintain",
  "sex": "female",
  "age": 25,
  "heightCm": 160,
  "weightKg": 60,
  "activityLevel": "sedentary"
}
```

- `goal`: `lose` | `maintain`
- `sex`: `male` | `female`
- `activityLevel`: `sedentary` | `light` | `moderate` | `active`
- `age` integer 10-120, `heightCm` up to 300, `weightKg` up to 500, `displayName` up to 80 chars

Response 200 (`GET /api/profiles/me` returns the same shape, or 404 until the profile is saved):

```json
{
  "id": "<user uuid>",
  "displayName": "Ayesha",
  "goal": "maintain",
  "sex": "female",
  "age": 25,
  "heightCm": 160,
  "weightKg": 60,
  "activityLevel": "sedentary",
  "dailyCalorieBudget": 1577
}
```

A profile row is created automatically at sign-up (so scan and meals work straight away), and `plan` returns 404 until `PUT /api/profiles/me` has been called.

### GET /api/nutrition/catalog

```json
{
  "dishes": [
    {
      "id": "<uuid>",
      "slug": "chicken-karahi",
      "name": "Chicken karahi",
      "category": "meat",
      "unit": "katori",
      "gramsPerUnit": 150,
      "kcalPer100g": 241,
      "proteinPer100g": 13.37,
      "carbsPer100g": 11.09,
      "fatPer100g": 15.85,
      "source": "khan2019",
      "basis": "lab",
      "unitBasis": "assumed"
    }
  ]
}
```

Values above are the real `chicken-karahi` catalog row. Use `slug` as the dish key everywhere else. `source` is `khan2019` | `farooq2026` | `indb`; `basis` is `lab` | `calculated`; `unitBasis` is `derived` | `assumed`. Fetch this once and cache it: it is also the list for manual dish entry.

### POST /api/scan

Request:

```json
{ "image": "<base64 of the photo, no data: prefix>", "mimeType": "image/jpeg" }
```

- `mimeType` must be `image/jpeg`, `image/png` or `image/webp`. **The app should send JPEG.**
- Send raw base64: an `image` starting with `data:` is rejected (400 "Send raw base64 without a data: prefix"), as is one that decodes to 0 bytes. Decoded image must be at most 6,000,000 bytes (else 400 `validation_error`). The whole request body is capped at 8 MB (else 413 `payload_too_large`). Compress and downscale on the device first. The server resizes to 1024 px anyway.
- An undecodable image gives 400 `validation_error` ("Unreadable image").

Response 200, detected:

```json
{
  "mode": "detected",
  "items": [
    {
      "dish": "chicken-karahi",
      "name": "Chicken karahi",
      "unit": "katori",
      "portion": 1,
      "confidence": 0.98,
      "needsConfirmation": false,
      "avoided": false
    }
  ]
}
```

Response 200, manual fallback:

```json
{ "mode": "manual", "reason": "daily_cap" }
```

See "Scan behaviour" below for how to handle each.

### POST /api/plan

Fits the confirmed dishes to today's remaining budget (daily budget minus calories already logged today). Needs a saved profile (404 until `PUT /api/profiles/me` has been called) and known slugs (404 otherwise).

Request: 1 to 10 items, `units` greater than 0 and at most 20.

```json
{ "items": [{ "slug": "chicken-karahi", "units": 1.5 }] }
```

Response 200:

```json
{
  "kind": "full",
  "remainingBefore": 1577,
  "totalCalories": 542,
  "remainingAfter": 1035,
  "isEstimate": true,
  "items": [
    {
      "slug": "chicken-karahi",
      "name": "Chicken karahi",
      "unit": "katori",
      "requestedUnits": 1.5,
      "units": 1.5,
      "calories": 542,
      "proteinG": 30.1,
      "carbsG": 25,
      "fatG": 35.7
    }
  ],
  "suggestions": []
}
```

`items[].units` is what the plan recommends; `requestedUnits` is what the user asked for. `suggestions` uses the same item shape.

### POST /api/meals

Saves what the user actually confirmed, plus what the scan predicted (used to learn from corrections). 1 to 10 items.

```json
{
  "items": [
    {
      "predictedDish": "chicken-karahi",
      "predictedPortion": 1,
      "confirmedDish": "chicken-karahi",
      "confirmedPortion": 1.5,
      "confidence": 0.98
    }
  ]
}
```

Rules:

- Each item needs a `predictedDish` or `confirmedDish` (slug); `predictedDish: "unknown"` does not count as a predicted dish. All five fields are required keys; use `null` for "none".
- `confirmedDish: null` means the user removed the item. A dish the user added by hand has `predictedDish: null`, `predictedPortion: null`, `confidence: null`.
- If `confirmedDish` is set, `confirmedPortion` must be greater than 0 and at most 20; if it is `null`, `confirmedPortion` must be `null` too. `predictedPortion` is `null` or between 0 and 20 (a scan emits 0 for an unknown item).
- At least one item must have a `confirmedDish`, else 400.
- Calories are computed by the server from the catalog for confirmed items only.

Response 201:

```json
{
  "id": "<meal uuid>",
  "totalCalories": 542,
  "eatenAt": "2026-11-01T13:05:11.123Z",
  "items": [
    {
      "predictedDish": "chicken-karahi",
      "predictedPortion": 1,
      "confirmedDish": "chicken-karahi",
      "confirmedPortion": 1.5,
      "confidence": 0.98
    }
  ]
}
```

### GET /api/meals/today

Meals eaten today, where "today" is the Pakistan (PKT, UTC+5) calendar day. Oldest first.

```json
{
  "day": "2026-11-01",
  "totalCalories": 542,
  "meals": [
    {
      "id": "<meal uuid>",
      "eatenAt": "2026-11-01T13:05:11.123Z",
      "totalCalories": 542,
      "items": [
        {
          "predictedDish": "chicken-karahi",
          "predictedPortion": 1,
          "confirmedDish": "chicken-karahi",
          "confirmedPortion": 1.5,
          "confidence": 0.98
        }
      ]
    }
  ]
}
```

### Meal history, week totals, edit and delete

All of these are scoped to the token's user. A meal that is not the caller's, or does not exist, is `404 not_found`; a malformed `:id` (not a UUID) is `400 validation_error`. Every calorie number is an estimate from the catalog. `Meal` is the same shape as one entry of `GET /api/meals/today` and the `POST /api/meals` response: `{ id, eatenAt, totalCalories, items: [{ predictedDish, predictedPortion, confirmedDish, confirmedPortion, confidence }] }`.

**GET /api/meals/week** returns exactly the last 7 PKT days, oldest first, today last. Days without meals are included as `0`/`0`.

```json
{ "days": [ { "day": "2026-10-29", "totalCalories": 0, "mealCount": 0 }, ..., { "day": "2026-11-04", "totalCalories": 1180, "mealCount": 2 } ] }
```

**GET /api/meals/history?days=14** returns only days that have meals, newest day first. `days` is an optional whole number from 1 to 60 (default 14, `400` otherwise) counting back from today, today included. Meals inside a day are oldest first, like `/today`.

```json
{ "days": [ { "day": "2026-11-04", "totalCalories": 1180, "meals": [ { "id": "<uuid>", "eatenAt": "2026-11-04T07:10:00.000Z", "totalCalories": 540, "items": [] } ] } ] }
```

**GET /api/meals/:id** returns `{ "meal": Meal }`.

**PATCH /api/meals/:id** replaces all items of the meal and returns `200 { "meal": Meal }`.

**Deviation from the draft contract.** The draft said `{ items: [{ slug, qty }] }` but also "same item shape and validation as POST /api/meals". The body is the POST body (the five-key items above, 1 to 10 items, at least one with a `confirmedDish`), because that is the shape the app already holds and the only one that can carry the original prediction. To keep the original prediction untouched, send each item's `predictedDish`, `predictedPortion` and `confidence` back exactly as `GET /api/meals/:id` returned them; only the `confirmed*` fields should change. The server stores whatever prediction fields it is sent and does not compare them with the old ones.

```json
{ "items": [ { "predictedDish": "chicken-karahi", "predictedPortion": 1, "confirmedDish": "chicken-karahi", "confirmedPortion": 0.5, "confidence": 0.98 } ] }
```

Totals are recomputed from the catalog, never taken from the client. `eatenAt` does not change, so the PKT day and the streak day stay as they were. Any age of meal can be edited. The item swap and the new total are one database transaction (`meal_replace_items`), so a failed edit keeps the old items. An unknown dish slug is `404 not_found`, as in a save.

**DELETE /api/meals/:id** returns `204` with no body. One database transaction (`meal_delete`) removes the meal, its items and its Food and Feel check-in, clears `tried_meal_id` on any experiment that pointed at it (the experiment stays), and, if it was the user's last meal with a confirmed item on that PKT day, removes that day's `streak_days` row so a deleted meal cannot keep a streak day alive. It touches no other day and no other user.

```
curl -X DELETE -H "Authorization: Bearer $TOKEN" $API/api/meals/$MEAL_ID   # 204
```

CORS now allows `GET, POST, PUT, PATCH, DELETE, OPTIONS`.

## Behaviour the app must handle

### Scan

- **Manual fallback is never a dead end.** `mode: "manual"` means no detection was done. Show manual dish entry from the catalog (`GET /api/nutrition/catalog`) and continue the normal flow.
  - `reason: "daily_cap"`: the user used all `SCAN_DAILY_CAP` scans (default 10) for the PKT day. Normally the scan is not run and not counted; if two scans race for the last slot, the loser may leave a recorded row and both can be refused.
  - `reason: "gemini_unavailable"`: Gemini failed or timed out on all 3 attempts (10 s each; timeouts, 503 and 429 are retried). The attempt still counts toward the cap. Allow up to about 45 s for a scan response; the API's worst case is about 32 s.
- **`needsConfirmation: true`** means show correction chips for that item instead of treating it as settled. It is true when confidence is below 0.6, when the dish is `unknown`, or when the model's portion was out of range (0 or above 20) and was replaced by `1`. When false, still let the user edit.
- **Nothing recognised:** `items` is a single entry `{ "dish": "unknown", "name": null, "unit": null, "portion": 0, "confidence": 0, "needsConfirmation": true }`. Treat it as "we could not tell", and send the user to manual entry. Whenever at least one catalog dish is recognised, `unknown` items are dropped, so a mixed result never contains `unknown` rows and the single `unknown` item above appears only when nothing was recognised.
- Gemini only picks from catalog slugs (or `unknown`). It never supplies calories.

### Units and portions

`unit` says what one portion is. The app should show portions as "1.5 katori", not grams.

| `unit`   | Step size |
| -------- | --------- |
| `roti`   | 1         |
| `piece`  | 1         |
| `glass`  | 1         |
| `katori` | 0.5       |
| `bowl`   | 0.5       |
| `plate`  | 0.5       |

The step is also the smallest portion the plan will recommend. Each dish has exactly one `unit`, listed in the catalog.

### Plan `kind`

| `kind`    | Meaning                                                                                                                                                                                                                                                           |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `full`    | Everything fits in the remaining budget. `units` equals `requestedUnits`.                                                                                                                                                                                         |
| `reduced` | Too much, so portions were trimmed (largest calorie item first, one step at a time). Compare `units` to `requestedUnits` and show the change.                                                                                                                     |
| `minimum` | Even one step of each dish exceeds the budget. Every item is at its minimum. `remainingAfter` is negative.                                                                                                                                                        |
| `light`   | Budget already used up (`remainingBefore` is 0 or less). Never refuses: every dish is cut to one step, and `suggestions` may offer a light side (`salad` and `raita` when the catalog has those slugs; today only `raita`), never one the user already requested. |

Never present `light` or `minimum` as an error or a scolding. No medical advice.

### Estimates

Every number is an estimate. Plan responses and nutrition carry `isEstimate: true`; the app must label calories, grams and macros as estimates (for example "about 542 kcal") everywhere they appear, including the daily log.

### Privacy note

A friend sees only username, display name, "logged today", the streak, nudge state and a goal the user chose to share, never meals, photos, calories or feelings. The shapes above are the whole contract; direct database access to the friend, goal and notification tables is closed, and clients must not write meals or check-ins to Supabase themselves.

## How a scan becomes a saved meal

1. `PUT /api/profiles/me` once (onboarding). Gives the daily budget.
2. `GET /api/nutrition/catalog` and cache it.
3. `POST /api/scan` with a JPEG. On `mode: "manual"`, go straight to manual entry in step 4.
4. User confirms: fix `needsConfirmation` items with chips, adjust portions in `unit` steps, add or remove dishes. Keep the scan's original `dish`, `portion` and `confidence` as the predicted values; for an unrecognised item send `predictedDish: "unknown"` (or `null`), which is stored as no predicted dish. Such an item needs a `confirmedDish`, else 400.
5. `POST /api/plan` with the confirmed `{ slug, units }` list. Show `kind`, the recommended `units`, `remainingAfter`, and the "estimate" label. The user may accept the plan's portions or keep their own.
6. `POST /api/meals` with predicted and confirmed values per item (the portions the user will actually eat as `confirmedPortion`).
7. `GET /api/meals/today` to refresh the daily log and total.

## Optional database tests

Some tests run real SQL and are skipped unless a disposable Postgres is provided: `HISSA_TEST_POSTGRES_CONTAINER=<container> npm test -w backend` (the container needs Supabase-style roles `anon`/`authenticated`/`service_role` with default table grants, an `auth.users` stub, `auth.uid()` reading `request.jwt.claim.sub`, and every migration applied), and `FEEL_LOCAL_DB_TEST=1` for the PostgREST integration test. They share tables and truncate with `cascade`, so run them with `--no-file-parallelism` to avoid flaky failures. The two-account smoke test is `node --env-file=<local env> database/scripts/smoke-v2-local.mjs` against a **local** Supabase stack and a running backend; it refuses non-local hosts.

## Question ranker

`npm run train:questions -w backend` regenerates `src/modules/feel/question-weights.ts` from seeded synthetic data (deterministic: run it twice and the file is byte-identical). It is an offline experiment about which question type to ask; see [decision 0006](../docs/decisions/0006-v2-learning-loop-and-backend-only-writes.md).
