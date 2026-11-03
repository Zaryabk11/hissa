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

The server refuses to start if a required variable is missing.

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
| GET    | `/api/auth`                          | The authenticated user: `{ "id": "<user id>" }`   |
| GET    | `/api/streaks`                       | Buddy status (see below)                          |
| POST   | `/api/streaks/invites`               | Create an invite: 201 `{ code, linkPath }`        |
| GET    | `/api/streaks/invites/:code`         | Preview an invite: `{ code, status: "pending" }`  |
| POST   | `/api/streaks/invites/:code/accept`  | Accept it: 204                                    |
| POST   | `/api/streaks/invites/:code/decline` | Decline it: 204                                   |
| POST   | `/api/streaks/end`                   | End the caller's pair or cancel their invite: 204 |
| POST   | `/api/streaks/nudge`                 | Nudge the buddy (once per day): 204               |
| POST   | `/api/streaks/nudge/ack`             | Mark received nudges as seen: 204                 |
| GET    | `/api/feel/due`                      | The meal waiting for a check-in, or `null`        |
| GET    | `/api/feel/question/:mealId`         | The follow-up question for a due meal             |
| POST   | `/api/feel/checkins`                 | Save a check-in: 201 `{ id }`                     |

### Duo Streaks

`GET /api/streaks` returns exactly these keys and nothing about the buddy's meals, photos, calories or feelings:

```json
{
  "pairStatus": "none | pending | active",
  "pendingInviteCode": "ABC123 or null (the caller's own pending code)",
  "streak": 0,
  "ownLoggedToday": false,
  "buddyLoggedToday": "true | false | null (null unless active)",
  "unreadNudge": false,
  "nudgedToday": false
}
```

Codes are six characters `A-Z0-9`. The app builds the share link with `Linking.createURL('/invite/<code>')` from `linkPath`. Self-invites, unknown or already-used codes, a second pair, a repeated accept, and nudging a buddy who already logged (or nudging twice in a day) return 400. A day counts when a person saved a meal (the meal save marks it); the shared streak counts consecutive PKT days on which both did, starting from the pair's acceptance day.

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

  `intent` is always `symptom_detail` for now (options `bloated|upset|other|not_sure`; the `pre_existing` question exists in the code but is not served because its answer cannot be stored yet). Options, labels and their order always come from the server, never from Gemini. `source` is `gemini` when Gemini's wording passed the checks, else `fallback` (timeout, invalid JSON, wrong option ids, a word outside the allowed vocabulary, or the history could not be read) and `text` is the fixed question. The wording guard is an allowlist of words; it checks vocabulary and shape, not meaning. Gemini is sent only the intent, the allowed ids and an aggregate summary of the caller's own check-ins (the check-in count, and whether a dish repeats with its exposed and comparison meal counts; no dish names, meal history or buddy data). The client makes at most 2 attempts inside an 8 s overall deadline, so a request waits at most about 8 s (normally 1 to 3 s). The answer for a user and meal is cached for 10 minutes in the API process (at most 500 entries), so repeating the request does not call Gemini again. 400 for a malformed meal id or a meal that is not due or already answered; 404 for a meal that is not the caller's. The answer is submitted with `POST /api/feel/checkins` (`symptom` accepts the `symptom_detail` ids).

- `POST /api/feel/checkins` body: `{ "mealId": "<uuid>", "energy": "low|okay|good", "stomach": "heavy|fine|light", "symptom": "bloated|upset|other|not_sure" }` (`symptom` optional; the app offers it after a heavy stomach). The body is strict: unknown fields give 400. 400 also for a meal that is not due, already answered, or not the caller's (404). Skipping a check-in writes nothing.

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
      "needsConfirmation": false
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

Buddies see only "logged today", the streak and nudge state, never meals, photos, calories or feelings. The shape above is the whole contract; direct database access to buddy tables is closed, and clients must not write meals or check-ins to Supabase themselves.

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
