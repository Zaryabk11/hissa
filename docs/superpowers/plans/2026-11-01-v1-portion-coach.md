# v1 Portion Coach Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Photo to confirmed portion plan, saved to the daily log, working end to end on the backend and database (PRD Module 1).

**Architecture:** Nine small backend pieces in the existing modular monolith. `nutrition` owns the dish catalog and per-portion maths from a DB table seeded from Pakistani research data. `scan` sends a resized photo to Gemini (names dishes only, never numbers). `profiles` computes the daily budget, `meals` stores predicted and confirmed items, `plan` fits portions to the remaining budget. Other modules are reached only through their `index.ts`.

**Tech Stack:** Node 24, Express 5, TypeScript, zod 4, Vitest, supertest, Supabase (service role), `sharp` (new, image resize), Gemini REST over `fetch` (no SDK).

**Spec:** `docs/superpowers/specs/2026-11-01-ai-backend-design.md`. Roadmap: `docs/superpowers/plans/2026-11-01-roadmap-v1-v2-v3.md`.

## Global Constraints

- Gemini only names dishes from our catalog (JSON schema enum of slugs plus `"unknown"`). No calorie or macro field exists in its schema. It never produces a number a user sees.
- Every number returned to a user carries `isEstimate: true`. Never medical advice.
- Calories per portion = `kcal_per_100g * grams_per_unit * units / 100`, computed in `nutrition`, never stored on `dishes`.
- Source precedence for catalog values: lab (Khan 2019) over paper table (Farooq 2026) over hand-picked INDB. Never use INDB fried, kofta or kebab rows (they count all frying oil as eaten).
- Default Gemini model `gemini-3.1-flash-lite`, env-configurable (`GEMINI_MODEL`). Photo resized so the longest side is 1024 px, sent as JPEG, prompt text before the image.
- Confidence below 0.6, or `unknown`, always asks the user. Low confidence is never silently accepted.
- Per-user daily scan cap, default 10, env `SCAN_DAILY_CAP`, counted per PKT day. Over the cap, or Gemini failing, the scan returns `mode: "manual"`; the scan flow never dead-ends.
- A day is the PKT calendar day (UTC+5, no DST).
- Backend rules (enforced by `npm run lint -w backend`): routes -> controller -> service -> repository; another module only through its `index.ts`; external APIs behind injected clients; the service role bypasses RLS so every query is scoped to `userId`.
- Never commit `.env`. Commit `.claude-logs/` with your changes (CLAUDE.md). Conventional commit messages.
- FatSecret is gone: no `FATSECRET_*` env vars, no `fatsecret.client.ts`.
- Commands run from the repo root: `npm test -w backend`, `npm run lint -w backend`, `npm run test:data`.

## Review Focus

1. **Photo with no food, or a blank or corrupt image:** Gemini returns `[]` or only `unknown`; the user gets one `unknown` item that needs confirmation, never a 500. A corrupt image returns 400. (Task 6)
2. **Cap at PKT midnight:** scans at 23:59 and 00:01 PKT fall on different days; a UTC-based day would be wrong for five hours. (Task 6)
3. **Bad portions:** `units` of 0, negative, `NaN` or 1000 is rejected with 400, in `plan` and `meals`. (Tasks 8, 9)
4. **Plan before profile:** a user with no profile calls `plan` and gets 404 "Set up your profile first", not a 500. (Task 9)
5. **Oversized photo body:** a body over the limit returns 413 with a JSON error, not 500. (Task 1)

---

### Task 1: Shared groundwork (config, PKT day, body limit, error pass-through)

**Files:**
- Modify: `backend/src/shared/config/index.ts`, `backend/.env.example`, `backend/src/app.ts`, `backend/src/shared/middleware/error-handler.ts`, `backend/src/__tests__/app.test.ts`
- Create: `backend/src/shared/time/pkt.ts`
- Test: `backend/src/shared/config/__tests__/config.test.ts`, `backend/src/shared/time/__tests__/pkt.test.ts`, `backend/src/shared/middleware/__tests__/error-handler.test.ts`

**Interfaces:**
- Produces: `Config` gains `GEMINI_MODEL: string` (default `gemini-3.1-flash-lite`) and `SCAN_DAILY_CAP: number` (default 10). The FatSecret keys stay until Task 4 removes them together with their only user.
- Produces: `pktDay(now: Date): string` returns `YYYY-MM-DD` in PKT. `pktDayBounds(day: string): { startIso: string; endIso: string }` returns the UTC instants bounding that PKT day.

- [ ] **Step 1: Write failing tests**
  - `config.test.ts`: `loadConfig(minimalEnv).GEMINI_MODEL === 'gemini-3.1-flash-lite'` and `.SCAN_DAILY_CAP === 10`; `SCAN_DAILY_CAP: '3'` gives `3`; missing `GEMINI_API_KEY` throws `/GEMINI_API_KEY/`.
  - `pkt.test.ts`: `pktDay(new Date('2026-11-01T18:59:59Z')) === '2026-11-01'`; `pktDay(new Date('2026-11-01T19:00:00Z')) === '2026-11-02'`; `pktDayBounds('2026-11-02')` equals `{ startIso: '2026-11-01T19:00:00.000Z', endIso: '2026-11-02T19:00:00.000Z' }`.
  - `error-handler.test.ts`: an error with `status = 413` and `expose = true` (what body-parser throws) returns 413 with body `{ error: { code: 'payload_too_large', message: ... } }`; an unknown error still returns 500 `internal_error`.
  - `app.test.ts`: change the stub-route test to `GET /api/streaks` (still a stub through v1); add `POST /api/scan` with an `image` string of 9,000,000 characters returns 413.
- [ ] **Step 2: Run** `npm test -w backend`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.** Config and `.env.example` per Interfaces (add `GEMINI_MODEL`, `SCAN_DAILY_CAP`). `pkt.ts`: shift by +5 h and slice ISO strings. `app.ts`: `express.json({ limit: '8mb' })`. `error-handler.ts`: map an error with numeric `status` 400-499 and `expose === true` to `{ error: { code, message } }` with code `payload_too_large` for 413 and `bad_request` otherwise.
- [ ] **Step 4: Run** `npm test -w backend`. Expected: PASS. Also run `npm run lint -w backend` (PASS).
- [ ] **Step 5: Commit** `feat(backend): config for Gemini model and scan cap, PKT day helper, 413 handling`

---

### Task 2: Catalog schema migration and seed pipeline

**Files:**
- Create: `database/supabase/migrations/20261101000000_catalog_and_scan_log.sql`, `database/scripts/build-seed.mjs`, `database/data/catalog.csv` (header row only for now)
- Overwrite (generated): `database/supabase/seed.sql`
- Modify: `package.json` (root): add script `"test:data": "node --test database/scripts/"`
- Test: `database/scripts/build-seed.test.mjs`

**Interfaces:**
- Produces: `parseCatalog(csvText: string): CatalogRow[]` and `renderSeed(rows: CatalogRow[]): string`, both exported from `build-seed.mjs`; running the file as a script reads `database/data/catalog.csv` and writes `database/supabase/seed.sql`.
- CSV header (exact): `slug,name,category,unit,grams_per_unit,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,source,basis,unit_basis`.
- Produces (DB): `dishes` without `fatsecret_food_id` and `local_*`; with `kcal_per_100g`, `protein_per_100g`, `carbs_per_100g`, `fat_per_100g` (kcal > 0, others >= 0, all not null), `source` in (`khan2019`,`farooq2026`,`indb`), `basis` in (`lab`,`calculated`), `unit_basis` in (`derived`,`assumed`), `unit` check now allowing `bowl`. New table `scan_log(id uuid pk default gen_random_uuid(), user_id uuid not null references profiles(id) on delete cascade, day date not null, created_at timestamptz not null default now())` with index `(user_id, day)`, RLS enabled and no policies (only the service role touches it).

- [ ] **Step 1: Write failing tests** in `build-seed.test.mjs` (`node:test`, `node:assert`), each feeding `parseCatalog` a fixture CSV string:
  - A valid row parses to numbers (`grams_per_unit` as number).
  - Each of these throws an `Error` whose message contains the row number: duplicate slug; slug not matching `^[a-z0-9-]+$`; unknown `category` (allowed: `rice,roti,fried,lentil,meat,sweets,other`); unknown `unit` (allowed: `roti,katori,plate,piece,glass,bowl`); `grams_per_unit` of 0; unknown `source`, `basis` or `unit_basis`; a name containing a comma or double quote; macro sanity failure, where `|kcal - (4*protein + 4*carbs + 9*fat)| > 0.25*kcal + 15`.
  - `renderSeed` output contains `on conflict (slug) do update set`, a name `Ma'ash daal` is emitted as `'Ma''ash daal'`, and `renderSeed([])` contains no `insert` (header comment only).
- [ ] **Step 2: Run** `npm run test:data`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** the migration (first statement: `delete from public.dishes;` because only unverified placeholders exist; this fails loudly if a meal references them) and `build-seed.mjs`. CSV parsing is a plain split on commas (names may not contain commas). The seed header comment reads: `GENERATED by database/scripts/build-seed.mjs from database/data/catalog.csv. Do not edit.`
- [ ] **Step 4: Run** `npm run test:data` (PASS), then from `database/`: `supabase start` then `supabase db reset`. Expected: reset succeeds; `select count(*) from scan_log` returns 0 and `\d dishes` shows the new columns.
- [ ] **Step 5: Commit** `feat(db): catalog schema for per-100g nutrition, scan_log, seed generator`

---

### Task 3: Fill the catalog from the research data

Can run in parallel with Tasks 1 and 4 to 9; only Task 10 needs it.

**Files:**
- Modify: `database/data/catalog.csv`, regenerate `database/supabase/seed.sql`
- Create: `docs/data-sources.md`
- Test: `database/scripts/catalog.test.mjs`

**Interfaces:**
- Consumes: `parseCatalog` from Task 2.
- Sources (spec 5.1, in precedence order): (1) Khan et al. 2019, *Progress in Nutrition* 21(2), 30 Khyber Pakhtunkhwa dishes, lab-measured per 100 g (`basis=lab`, `source=khan2019`); (2) Farooq et al. 2026, *Nutrients* 18(19):3173, the supplementary PDF `nutrients-4519868-supplementary.pdf` at the repo root (gitignored, on the user's machine), about 59 dishes per 100 g (`basis=calculated`, `source=farooq2026`); (3) INDB from `github.com/lindsayjaacks/Indian-Nutrient-Databank-INDB-` (`INDB.xlsx` and `recipes_servingsize.xlsx`), hand-picked only: roti, naan, paratha, pulao, kheer, halwa, raita, lassi, kulfi, khichdi, daals, saag, fish curry (`source=indb`, `basis=calculated`). If the Khan table cannot be retrieved, use the Farooq value and say so in `docs/data-sources.md`.
- Portions: INDB gives a unit and kcal per unit, so `grams_per_unit = kcal_per_unit / (kcal_per_100g / 100)` with `unit_basis=derived`. Dishes without INDB units get a default unit size you choose, with `unit_basis=assumed`.
- Produces: at least 30 valid rows. Slugs are kebab-case (`chicken-karahi`).

- [ ] **Step 1: Write failing tests** in `catalog.test.mjs`: `parseCatalog` accepts the real `catalog.csv` and returns at least 30 rows. Lab wins over the paper (values from spec 5.1, kcal per 100 g): `chicken-karahi` 241, `nihari` 172, `haleem` 128, `bhindi` 158, each with `basis === 'lab'`. `roti` has `unit === 'roti'` and `grams_per_unit` between 30 and 45; `naan` between 45 and 60. No row has `source === 'indb'` and a slug containing `samosa`, `kofta`, `kebab` or `pakora`.
- [ ] **Step 2: Run** `npm run test:data`. Expected: FAIL (too few rows).
- [ ] **Step 3: Transcribe** the rows by hand from the sources; do not invent a value. Where sources disagree, take the highest-precedence one. Write `docs/data-sources.md` listing each source, what it supplied, and the dishes taken from each.
- [ ] **Step 4: Regenerate** `node database/scripts/build-seed.mjs`, then run `npm run test:data` (PASS) and `supabase db reset` from `database/` (succeeds, `select count(*) from dishes` is at least 30).
- [ ] **Step 5: Print** five randomly chosen rows with their source row for the user to spot-check before merging.
- [ ] **Step 6: Commit** `feat(db): seed catalog from Pakistani lab and paper data`

---

### Task 4: Nutrition module

**Files:**
- Delete: `backend/src/modules/nutrition/fatsecret.client.ts`, `backend/src/modules/nutrition/local-table.ts`
- Modify: `nutrition.types.ts`, `nutrition.repository.ts`, `nutrition.service.ts`, `nutrition.controller.ts`, `nutrition.routes.ts`, `nutrition.schemas.ts`, `index.ts` (all under `backend/src/modules/nutrition/`), `backend/eslint.config.mjs` (drop `local-table` from `forbiddenByLayer` and the `client` file list), `backend/src/modules/index.ts`, `backend/src/shared/config/index.ts` (remove `FATSECRET_CLIENT_ID` and `FATSECRET_CLIENT_SECRET`), `backend/vitest.config.mts` and `backend/.env.example` (remove the same two)
- Test: `backend/src/modules/nutrition/__tests__/nutrition.service.test.ts` (replace)

**Interfaces:**
- Produces types: `Unit = 'roti'|'katori'|'plate'|'piece'|'glass'|'bowl'`; `Dish { id; slug; name; category; unit: Unit; gramsPerUnit; kcalPer100g; proteinPer100g; carbsPer100g; fatPer100g; source: 'khan2019'|'farooq2026'|'indb'; basis: 'lab'|'calculated'; unitBasis: 'derived'|'assumed' }`; `PortionNutrition { slug; units; grams; calories; proteinG; carbsG; fatG; source; basis; unitBasis; isEstimate: true }`.
- Produces repository: `listDishes(): Promise<Dish[]>`, `findDishBySlug(slug: string): Promise<Dish | null>`.
- Produces service: `listCatalog(): Promise<Dish[]>`, `getDish(slug: string): Promise<Dish>` (throws `NotFoundError`), `portionNutrition(slug: string, units: number): Promise<PortionNutrition>`. `index.ts` exports the types `NutritionService`, `Dish`, `Unit`, `PortionNutrition` (other modules import them only from there); `createNutritionModule({ db }: { db: Db })`. From this task on, `backend/src/modules/index.ts` builds each module once and keeps its `service`, so later tasks can inject one module's service into another.
- Produces route: `GET /api/nutrition/catalog` returns `{ dishes: Dish[] }`.

- [ ] **Step 1: Write failing tests** with a fake repository holding one dish `{ slug: 'chicken-karahi', unit: 'katori', gramsPerUnit: 150, kcalPer100g: 241, proteinPer100g: 17, carbsPer100g: 4, fatPer100g: 18, ... }`:
  - `portionNutrition('chicken-karahi', 1.5)` gives `grams 225` and `calories 542` (241 * 225 / 100 = 542.25, rounded to an integer), macros rounded to 1 decimal, `isEstimate: true`.
  - `portionNutrition('nope', 1)` rejects with `NotFoundError`.
  - `portionNutrition('chicken-karahi', 0)` rejects with `ValidationError`.
- [ ] **Step 2: Run** `npm test -w backend -- nutrition`. Expected: FAIL.
- [ ] **Step 3: Implement.** The repository maps snake_case rows to `Dish`. Remove FatSecret; the lint config edit keeps `npm run lint -w backend` green.
- [ ] **Step 4: Run** `npm test -w backend` and `npm run lint -w backend`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(nutrition): catalog and per-portion nutrition from DB, remove FatSecret`

---

### Task 5: Gemini client

**Files:**
- Modify: `backend/src/modules/scan/gemini.client.ts`, `backend/src/modules/scan/index.ts` (call `createGeminiClient({ apiKey: config.GEMINI_API_KEY, model: config.GEMINI_MODEL })`), `backend/src/modules/scan/__tests__/scan.service.test.ts` (only the `createGeminiClient` call, so tsc passes; Task 6 replaces the file)
- Test: `backend/src/modules/scan/__tests__/gemini.client.test.ts`

**Interfaces:**
- Produces: `CatalogEntry { slug: string; unit: string }`; `DetectedDish { dish: string; portion: number; confidence: number }` (unchanged); `class GeminiUnavailableError extends Error`; `GeminiClient { detectDishes(photo: Buffer, catalog: CatalogEntry[]): Promise<DetectedDish[]> }`; `createGeminiClient(opts: { apiKey: string; model: string; fetchFn?: typeof fetch }): GeminiClient`.

- [ ] **Step 1: Write failing tests** with a fake `fetchFn` returning canned Gemini responses (`{ candidates: [{ content: { parts: [{ text: '<json>' }] } }] }`):
  - Request: URL is `https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent`; header `x-goog-api-key` equals the key; `contents[0].parts[0]` is the text prompt and `parts[1].inline_data.mime_type === 'image/jpeg'` (text before image); `generationConfig.responseMimeType === 'application/json'`; the schema's `dish.enum` equals the slugs plus `'unknown'`; the schema has no calorie or macro property; the prompt text mentions each dish's unit.
  - A valid answer `[{dish:'daal', portion_units:1.5, confidence:0.9}]` maps to `[{ dish:'daal', portion:1.5, confidence:0.9 }]`.
  - A slug not in the catalog maps to `'unknown'`; confidence is clamped to 0 to 1.
  - HTTP 429 and a network error both reject with `GeminiUnavailableError`.
  - Non-JSON text or a schema mismatch resolves to `[]`.
- [ ] **Step 2: Run** `npm test -w backend -- gemini`. Expected: FAIL.
- [ ] **Step 3: Implement** with `fetch`, `AbortSignal.timeout(15000)`, and zod to validate the parsed array. Prompt wording (fixed): "Name each distinct dish visible in this photo of a meal, choosing only from the allowed list. Answer 'unknown' if none fits. For each dish give portion_units as a count of that dish's own unit, and confidence from 0 to 1. Most prominent dish first." followed by one line per dish: `<slug> (unit: <unit>)`. The schema uses Gemini's `responseSchema` format (`type: 'ARRAY'` of `type: 'OBJECT'` with `dish` enum, `portion_units` NUMBER, `confidence` NUMBER, all required).
- [ ] **Step 4: Run** `npm test -w backend -- gemini` (PASS) and `npm run lint -w backend` (PASS).
- [ ] **Step 5: Commit** `feat(scan): Gemini client with structured output, no numbers from the model`

---

### Task 6: Scan service, resize, cap and route

**Files:**
- Create: `backend/src/modules/scan/resize-photo.ts`
- Modify: `scan.types.ts`, `scan.schemas.ts`, `scan.repository.ts`, `scan.service.ts`, `scan.controller.ts`, `scan.routes.ts`, `index.ts` (all under `backend/src/modules/scan/`), `backend/src/modules/index.ts`, `backend/package.json` (add `sharp`, via `npm install sharp -w backend`), `backend/src/__tests__/app.test.ts`
- Test: `backend/src/modules/scan/__tests__/scan.service.test.ts` (replace), `backend/src/modules/scan/__tests__/resize-photo.test.ts`

**Interfaces:**
- Consumes: `GeminiClient`, `CatalogEntry`, `GeminiUnavailableError` (Task 5); `NutritionService.listCatalog()` through `../nutrition` (Task 4); `pktDay` (Task 1).
- Produces: `resizePhoto(input: Buffer): Promise<Buffer>` (JPEG, longest side at most 1024 px, honours EXIF rotation, never enlarges; throws `ValidationError('Unreadable image')` on bad input).
- Produces repository: `countScansForDay(userId: string, day: string): Promise<number>`, `recordScan(userId: string, day: string): Promise<void>`.
- Produces: `ScanItem { dish: string; name: string | null; unit: Unit | null; portion: number; confidence: number; needsConfirmation: boolean }`; `ScanResult = { mode: 'detected'; items: ScanItem[] } | { mode: 'manual'; reason: 'daily_cap' | 'gemini_unavailable' }`.
- Produces service: `createScanService(deps: { repository; gemini; nutrition: Pick<NutritionService, 'listCatalog'>; dailyCap: number; now?: () => Date })` with `scanPhoto(userId: string, input: { image: string; mimeType: 'image/jpeg' | 'image/png' | 'image/webp' }): Promise<ScanResult>` (`image` is base64). Constant `CONFIDENCE_FLOOR = 0.6`.
- Produces route: `POST /api/scan`, body `{ image, mimeType }`, decoded image at most 6,000,000 bytes (400 otherwise). Replaces the stub `GET /api/scan`.
- Wiring: `modules/index.ts` builds nutrition first and passes its service to scan: `createScanModule({ db, config, nutrition })`.

- [ ] **Step 1: Write failing tests** (fake repository, gemini, nutrition; fixed `now`):
  - Under the cap: `recordScan` called once with `(userId, '2026-11-02')` for `now = 2026-11-01T19:30:00Z` (PKT already the 2nd); Gemini receives the catalog as `{ slug, unit }[]`.
  - Cap at midnight: with `countScansForDay` stubbed to return 10 only for `'2026-11-01'`, a scan at `2026-11-01T19:30:00Z` still proceeds (new PKT day).
  - At the cap (`count === dailyCap`): returns `{ mode: 'manual', reason: 'daily_cap' }`, Gemini not called, `recordScan` not called.
  - `GeminiUnavailableError` returns `{ mode: 'manual', reason: 'gemini_unavailable' }` and the scan was still recorded.
  - Confidence 0.59 gives `needsConfirmation: true`; 0.6 gives `false`; `unknown` is always `true`.
  - Empty Gemini result returns a single item `{ dish: 'unknown', name: null, unit: null, portion: 0, confidence: 0, needsConfirmation: true }`.
  - Known slug fills `name` and `unit` from the catalog.
  - Garbage base64 rejects with `ValidationError`.
  - `resize-photo.test.ts`: a generated 2000x1000 PNG (made with sharp) comes back as JPEG with width 1024 and height 512; a 400x300 image keeps its size.
  - `app.test.ts`: `POST /api/scan` with an invalid `mimeType` returns 400.
- [ ] **Step 2: Run** `npm test -w backend -- scan`. Expected: FAIL.
- [ ] **Step 3: Implement.** Record the scan before calling Gemini so retries cannot beat the cap. The controller reads `req.userId` and throws `UnauthorizedError` if absent; the route uses `validate('body', scanBodySchema)`.
- [ ] **Step 4: Run** `npm test -w backend` and `npm run lint -w backend`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(scan): POST /api/scan with resize, daily cap and manual fallback`

---

### Task 7: Profiles and daily budget

**Files:**
- Create: `backend/src/modules/profiles/budget.ts`
- Modify: `profiles.types.ts`, `profiles.schemas.ts`, `profiles.repository.ts`, `profiles.service.ts`, `profiles.controller.ts`, `profiles.routes.ts`, `index.ts` (all under `backend/src/modules/profiles/`)
- Test: `backend/src/modules/profiles/__tests__/budget.test.ts`, `backend/src/modules/profiles/__tests__/profiles.service.test.ts` (replace)

**Interfaces:**
- Produces: `computeDailyBudget(i: { sex: 'male'|'female'; age: number; heightCm: number; weightKg: number; activityLevel: 'sedentary'|'light'|'moderate'|'active'; goal: 'lose'|'maintain' }): number`. Mifflin-St Jeor BMR = `10*kg + 6.25*cm - 5*age + (male 5, female -161)`; times activity factor 1.2, 1.375, 1.55, 1.725; goal `lose` subtracts 500 kcal with a floor of 1200 (**my call**, not in the spec); result rounded to an integer.
- Produces: `Profile { id; displayName: string | null; goal; sex; age; heightCm; weightKg; activityLevel; dailyCalorieBudget: number }`; service `upsertProfile(userId: string, input: ProfileInput): Promise<Profile>`, `getProfile(userId: string): Promise<Profile>` (throws `NotFoundError`), `getDailyBudget(userId: string): Promise<number>` (throws `NotFoundError('Set up your profile first')` when no profile or no budget).
- Produces routes: `GET /api/profiles/me`, `PUT /api/profiles/me` (body: `displayName?`, `goal`, `sex`, `age` int 10 to 120, `heightCm` > 0, `weightKg` > 0, `activityLevel`; the budget is computed, never accepted from the client).

- [ ] **Step 1: Write failing tests.**
  - `budget.test.ts`: female, 25, 160 cm, 60 kg, sedentary, maintain gives `1577`; same with `lose` gives `1200` (floor); male, 30, 175 cm, 80 kg, moderate, maintain gives `2711`; `lose` gives `2211`.
  - `profiles.service.test.ts` (fake repository): `upsertProfile` stores the computed budget and scopes by `userId`; `getDailyBudget` for a missing profile rejects with `NotFoundError`; a client-supplied budget field is ignored.
- [ ] **Step 2: Run** `npm test -w backend -- profiles`. Expected: FAIL.
- [ ] **Step 3: Implement.** The repository upserts into `profiles` on `id = userId`.
- [ ] **Step 4: Run** `npm test -w backend` and `npm run lint -w backend`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(profiles): profile upsert with Mifflin-St Jeor daily budget`

---

### Task 8: Meals module (save predicted and confirmed, daily log)

**Files:**
- Modify: `meals.types.ts`, `meals.schemas.ts`, `meals.repository.ts`, `meals.service.ts`, `meals.controller.ts`, `meals.routes.ts`, `index.ts` (all under `backend/src/modules/meals/`), `backend/src/modules/index.ts`
- Test: `backend/src/modules/meals/__tests__/meals.service.test.ts` (replace)

**Interfaces:**
- Consumes: `NutritionService.getDish`, `portionNutrition` (Task 4); `pktDay`, `pktDayBounds` (Task 1).
- Produces input: `SaveMealInput { items: Array<{ predictedDish: string | null; predictedPortion: number | null; confirmedDish: string | null; confirmedPortion: number | null; confidence: number | null }> }`. `predictedDish` is null for `unknown` or a dish the user added. Rules (zod): 1 to 10 items; each item has a predicted or a confirmed dish; `confirmedDish` needs `confirmedPortion` in (0, 20]; `confidence` in 0 to 1.
- Produces: `Meal { id: string; eatenAt: string; totalCalories: number; items: MealItem[] }`; service `saveMeal(userId: string, input: SaveMealInput): Promise<Meal>`, `listToday(userId: string): Promise<{ day: string; meals: Meal[]; totalCalories: number }>`, `caloriesToday(userId: string): Promise<number>`; `MealsService` exported from `index.ts`; `createMealsModule({ db, nutrition })`.
- Produces repository: `insertMeal(userId, totalCalories): Promise<{ id: string; eatenAt: string }>`, `insertItems(mealId, rows): Promise<void>`, `deleteMeal(userId, mealId): Promise<void>`, `listMealsBetween(userId, startIso, endIso): Promise<Meal[]>`.
- Produces routes: `POST /api/meals`, `GET /api/meals/today`.

- [ ] **Step 1: Write failing tests** (fake repository, fake nutrition):
  - Total calories is the sum of `portionNutrition(confirmedDish, confirmedPortion).calories` over confirmed items; an item the user removed (predicted set, confirmed null) adds 0 and is still stored with its prediction.
  - Predicted and confirmed values are both written to the item rows.
  - A meal with no confirmed dish at all rejects with `ValidationError('A meal needs at least one confirmed dish')`.
  - When `insertItems` rejects, `deleteMeal(userId, mealId)` is called and the error propagates (no orphan meal).
  - `listToday` calls the repository with the user id and the PKT bounds of `now`, and sums `totalCalories`.
  - A unit-0 and a 1000-unit portion are rejected by the schema (400).
- [ ] **Step 2: Run** `npm test -w backend -- meals`. Expected: FAIL.
- [ ] **Step 3: Implement.** Streak marking is v2; do not add a hook now. `photo_path` stays null in v1.
- [ ] **Step 4: Run** `npm test -w backend` and `npm run lint -w backend`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(meals): save predicted and confirmed items, daily log`

---

### Task 9: Plan module

**Files:**
- Modify: `plan.types.ts`, `plan.schemas.ts`, `plan.service.ts`, `plan.controller.ts`, `plan.routes.ts`, `index.ts` (all under `backend/src/modules/plan/`), `backend/src/modules/index.ts`
- Test: `backend/src/modules/plan/__tests__/plan.service.test.ts` (replace)

**Interfaces:**
- Consumes: `ProfilesService.getDailyBudget(userId)` (Task 7), `MealsService.caloriesToday(userId)` (Task 8), `NutritionService.getDish`, `portionNutrition`, `listCatalog` (Task 4), all through their `index.ts`. `createPlanModule({ db, profiles, meals, nutrition })`.
- Produces: `PlanItem { slug; name; unit; requestedUnits: number; units: number; calories; proteinG; carbsG; fatG }`; `Plan { kind: 'full' | 'reduced' | 'minimum' | 'light'; remainingBefore: number; totalCalories: number; remainingAfter: number; items: PlanItem[]; suggestions: PlanItem[]; isEstimate: true }`; service `buildPlan(userId: string, items: Array<{ slug: string; units: number }>): Promise<Plan>`.
- Produces route: `POST /api/plan`, body `{ items: [{ slug, units }] }`, 1 to 10 items, `units` in (0, 20].
- Step size per unit (my call; spec says fit "in roti, katori or plate steps"): `roti` 1, `piece` 1, `glass` 1, `katori` 0.5, `bowl` 0.5, `plate` 0.5. The minimum portion is one step.

**Algorithm** (the signature and tests do not determine it): `remaining = budget - caloriesToday`. If `remaining <= 0`: `kind 'light'`, every item at one step, `suggestions` are the catalog dishes with slugs `salad` and `raita` (those that exist) at one step; never a refusal. Else if the requested total fits: `kind 'full'`. Else repeatedly lower, by one step, the item with the highest current calories among those above their minimum, until the total fits (`kind 'reduced'`) or none can be lowered (`kind 'minimum'`).

- [ ] **Step 1: Write failing tests** with fake dishes `roti` (unit roti, 40 g, 275 kcal/100 g, so 110 kcal per roti), `karahi` (katori, 150 g, 241 kcal/100 g, so 362 per katori and 181 per half), `raita` (katori) and a budget minus calories-today stub:
  - `remaining 600`, request roti x2 (220) plus karahi x1 (362) = 582: `kind 'full'`, units unchanged, `remainingAfter 18`.
  - `remaining 500`, same request: `kind 'reduced'`, karahi lowered to `0.5` first (highest calories), roti stays `2`, total 401.
  - `remaining 100`, same request: `kind 'minimum'`, roti `1`, karahi `0.5`, total 291, `remainingAfter -191`.
  - `remaining 0`: `kind 'light'`, roti `1`, karahi `0.5`, `suggestions` contains `raita`.
  - A profile-less user: `getDailyBudget` rejects with `NotFoundError('Set up your profile first')` and the plan call propagates it.
  - Every response has `isEstimate: true`; the schema rejects `units: 0`, `units: -1` and 11 items.
- [ ] **Step 2: Run** `npm test -w backend -- plan`. Expected: FAIL.
- [ ] **Step 3: Implement** per the algorithm.
- [ ] **Step 4: Run** `npm test -w backend` and `npm run lint -w backend`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(plan): fit portions to the remaining daily budget`

---

### Task 10: End-to-end check on local Supabase and API contract

**Files:**
- Create: `backend/README.md` (API contract section and run steps)
- Modify: `backend/.env.example` if the run reveals a missing variable

**Interfaces:** consumes everything above. No new code.

- [ ] **Step 1: Prepare.** `npm install` at the root. Ask the user to put their Gemini key in `backend/.env` as `GEMINI_API_KEY` (never print or commit it). Fill the rest of `backend/.env` from `supabase status -o env` run in `database/`.
- [ ] **Step 2: Start** `supabase start` then `supabase db reset` in `database/`, then `npm run dev`. Expected: `Hissa API listening on :3000`.
- [ ] **Step 3: Walk the flow with curl.** Sign up a local test user at `POST <SUPABASE_URL>/auth/v1/signup` (local dev only, throwaway credentials) and use the returned `access_token` as the bearer token. Then:
  1. `PUT /api/profiles/me` with a valid profile; expect `dailyCalorieBudget` as an integer.
  2. `GET /api/nutrition/catalog`; expect at least 30 dishes.
  3. `POST /api/scan` with a photo from `SMF-DataSet-Flat/SMF-DataSet-Flat/chicken_karahi/` (gitignored, local) base64-encoded; expect `mode: "detected"` and, from the real Gemini, a `chicken-karahi` item. If the dish is wrong, that is a measured outcome to report, not a failure of this task.
  4. `POST /api/plan` with the confirmed items; expect a `kind` and `isEstimate: true`.
  5. `POST /api/meals` with the predicted and confirmed items; expect `totalCalories`.
  6. `GET /api/meals/today`; expect the meal and a matching `totalCalories`.
  7. Repeat the scan until the cap; the 11th returns `mode: "manual"`, `reason: "daily_cap"`.
  8. Call any `/api/*` route without a token; expect 401.
- [ ] **Step 4: Write** the API contract (endpoints, bodies, response shapes, the `manual` fallback and `needsConfirmation` meaning) in `backend/README.md` for the app developer.
- [ ] **Step 5: Run** `npm test`, `npm run test:data` and `npm run lint`. Expected: all PASS.
- [ ] **Step 6: Commit** `docs(backend): API contract and v1 run steps`
