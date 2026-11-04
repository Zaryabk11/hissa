# Hissa v3 avoids and recipes: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Users set foods they avoid (onboarding and Profile); scan flags avoided dishes; a ranked recipe list and detail with one-tap "not for me", all enforced in backend code.

**Architecture:** One migration adds `dishes.protein_type`, `user_avoids`, `recipes`, `recipe_feedback`. `profiles` owns avoids, `scan` flags them, a new `recipes` module ranks with a pure function using `profiles`, `meals`, `feel` and `nutrition` through their `index.ts`. Recipe text is drafted once by Gemini (offline script) and served only after a human sets `reviewed: true`. The Expo app gets an onboarding step, a Profile section, a scan badge, a Today card and two recipe routes.

**Tech Stack:** Express 5 + TypeScript + zod + Supabase JS (backend, vitest + supertest); Expo Router + React Native + TypeScript (frontend, vitest on view-model files); Postgres migrations; Node `.mjs` seed builder.

**Spec:** `docs/superpowers/specs/2026-11-04-v3-avoids-and-recipes-design.md`

## Global Constraints

- Layering routes -> controller -> service -> repository; cross-module imports only through `index.ts`; `npm run lint` enforces it (add `recipes` to the `modules` list in `backend/eslint.config.mjs`).
- Every query is scoped to `req.userId`. New tables: owner/authenticated **select-only** RLS, no insert/update/delete grant to `authenticated` (decision 0006).
- Every number shown is an estimate; copy never says allergy, safe, suits you, causes, healthy or diagnosis.
- Avoided dishes and proteins never appear in `GET /api/recipes`. Scan never removes an avoided item; it sets `avoided: true`.
- Gemini never ranks, filters or produces numbers other than `minutes` and `servings` in the offline draft; recipe nutrition comes from the linked catalog dish.
- Only `reviewed = true` recipes are served.
- Protein types: exactly `beef`, `mutton`, `chicken`, `fish`, `egg`, `veg` (or null).
- Responsive: use `HissaScreen` (column 480/560, split pane from 1100); recipe list two columns from width 900; tap targets `MIN_TAP`; no horizontal scroll at 320 px.
- No deploy, no hosted migration, no push. Commit after each task with the attribution line from the session.
- Session logs: commit `.claude-logs/` with changes.

## Review Focus

1. A user avoids `beef` but a recipe's dish has `protein_type` null (e.g. raita): it must still be served; a recipe whose dish is `beef-pulao` must not. Test in Task 5 (`rank drops protein-avoided and keeps null-protein`).
2. PUT avoids with an unknown dish slug or protein: 400, nothing written (Task 2 `rejects unknown slug`).
3. Remaining calories are negative (over budget): ranking still returns recipes, lowest-kcal first among fit-zero (Task 5 `over budget still returns, cheapest first`).
4. "Not for me" twice, or undo of a recipe never marked: idempotent 204, no error (Task 5 route tests).
5. Profile has no avoids row and the user has no meals or check-ins (brand-new account): recipes and scan still work (Task 3 and Task 5 `empty profile`).

---

### Task 1: Schema, protein types and seed

**Files:**
- Create: `database/supabase/migrations/20261104000100_v3_avoids_recipes.sql`
- Modify: `database/data/catalog.csv` (add trailing `protein_type` column), `database/scripts/build-seed.mjs`, `database/scripts/build-seed.test.mjs`, regenerate `database/supabase/seed.sql`

**Interfaces:**
- Produces: tables `user_avoids(id uuid pk, user_id uuid fk auth.users on delete cascade, kind text check in ('dish','protein'), dish_id uuid null fk dishes, protein text null check in the six types, created_at)`, with check `(kind='dish' and dish_id is not null and protein is null) or (kind='protein' and protein is not null and dish_id is null)` and unique indexes on `(user_id, dish_id)` and `(user_id, protein)`; `recipes(id uuid pk default gen_random_uuid(), slug text unique, title text, dish_id uuid not null fk dishes, minutes int > 0, servings int > 0, ingredients jsonb, steps jsonb, reviewed boolean default false)`; `recipe_feedback(user_id, recipe_id fk recipes on delete cascade, verdict text check = 'not_for_me', created_at, primary key (user_id, recipe_id))`; `dishes.protein_type text null check in the six types`.
- The migration also runs `update dishes set protein_type = ...` per the mapping below so existing databases are backfilled.

Protein mapping (my call, every other slug is null):
- beef: beef-korma, beef-pulao, beef-biryani, beef-karahi, nihari, haleem, kachalo-qeema, karela-qeema, shimla-mirch-qeema, macaroni-qeema, keema, kofta, chapli-kebab, seekh-kebab, paye
- mutton: aloo-gosht, mutton-karahi, mutton-biryani, mutton-pulao, kaleji, palak-gosht
- chicken: chicken-biryani, chicken-karahi, chicken-pulao, chicken-korma, chicken-tikka, malai-boti
- fish: machli, fish-curry
- egg: egg-fried-rice, anda-paratha
- veg: baingan, bhindi, chana-daal, vegetable-rice, choley, daal-kaddu, maash-daal, kadhi-pakora, lobia, mixed-daal, mixed-sabzi, palak, tori, khichdi, matar-rice, saag, aloo-baingan, ghiya, karela, aloo-methi, aloo-palak, samosa, pakode

- [ ] **Step 1:** In `build-seed.test.mjs` add tests: `parseCatalog accepts an empty protein_type as null`, `rejects unknown protein_type "pork"` (error mentions the row), and `seed sql includes protein_type`. Run `node --test database/scripts/` (or the existing `npm run test:data`), expect FAIL.
- [ ] **Step 2:** Add `protein_type` as the last column in `COLUMNS`, an empty-allowed enum check, null serialisation, and the column in the generated insert. Fill the CSV per the mapping. Regenerate `seed.sql`.
- [ ] **Step 3:** Write the migration (tables, checks, indexes, RLS enable, policies `user_avoids_owner_read`/`recipe_feedback_owner_read` `for select using (user_id = auth.uid())`, `recipes_read for select to authenticated using (reviewed)`, `revoke insert, update, delete on ... from authenticated, anon`, backfill updates).
- [ ] **Step 4:** `npm run test:data` passes; `catalog.test.mjs` still passes.
- [ ] **Step 5:** Commit `feat(db): v3 avoids, recipes and dish protein types`.

### Task 2: Avoids in profiles (and `proteinType` on Dish)

**Files:**
- Modify: `backend/src/modules/nutrition/nutrition.types.ts`, `nutrition.repository.ts` (select and map `protein_type`), `profiles/profiles.{types,schemas,repository,service,controller,routes}.ts`, `profiles/index.ts`
- Create: `profiles/avoids.ts` (pure helpers)
- Test: `profiles/__tests__/avoids.test.ts`, `avoids.route.test.ts`, extend `nutrition` repository test if one maps rows

**Interfaces:**
- `Dish.proteinType: ProteinType | null`; `export type ProteinType = 'beef'|'mutton'|'chicken'|'fish'|'egg'|'veg'` from `nutrition/index.ts`.
- `export interface Avoids { proteins: ProteinType[]; dishes: string[] }` (dish slugs, both sorted, unique).
- `export function isAvoided(avoids: Avoids, dish: { slug: string; proteinType: ProteinType | null }): boolean` in `profiles/avoids.ts`, re-exported from `profiles/index.ts` with `Avoids`.
- `ProfilesService.getAvoids(userId): Promise<Avoids>` (empty lists when none) and `replaceAvoids(userId, input: Avoids): Promise<Avoids>`.
- Routes: `GET /api/profiles/me/avoids` -> `Avoids`; `PUT /api/profiles/me/avoids` body `{ proteins: ProteinType[] (max 6), dishes: string[] (max 100, slug regex) }` -> saved `Avoids`. Unknown dish slug -> 400 `ValidationError` naming the slug; nothing written.
- Repository: `listAvoids(userId)` (join `dishes(slug)`), `dishIdsBySlug(slugs): Promise<Map<string,string>>`, `replaceAvoids(userId, rows)` (delete then insert, both `.eq('user_id', userId)`).

- [ ] **Step 1:** Tests: `isAvoided matches dish slug`, `matches protein`, `null protein never matches a protein avoid`; service `rejects unknown slug` (repository insert not called), `dedupes and sorts`, `empty profile returns empty lists`; route `PUT 400 on protein "pork"`, `GET returns lists`, both scoped to the auth user id. Run `npm test -w backend -- avoids`, expect FAIL.
- [ ] **Step 2:** Implement. Keep `profileBodySchema` unchanged.
- [ ] **Step 3:** `npm test -w backend` and `npm run lint -w backend` pass.
- [ ] **Step 4:** Commit `feat(profiles): avoid list endpoints`.

### Task 3: Scan flags avoided dishes

**Files:** Modify `backend/src/modules/scan/scan.types.ts`, `scan.service.ts`, `scan/index.ts`, `backend/src/modules/index.ts`; test `scan/__tests__/scan.service.test.ts`.

**Interfaces:**
- Consumes: `ProfilesService.getAvoids`, `isAvoided`, `Dish.proteinType`.
- `ScanItem.avoided: boolean` (false for `unknown`). Scan deps gain `profiles: Pick<ProfilesService, 'getAvoids'>`; `createScanModule` gets `profiles`.

- [ ] **Step 1:** Tests: `flags an avoided dish and keeps it`, `flags by protein`, `unknown item is not avoided`, `empty avoids flags nothing`. Expect FAIL.
- [ ] **Step 2:** Implement; fetch avoids only on the `detected` path. Update existing test fakes for the new dep.
- [ ] **Step 3:** Backend tests and lint pass. Commit `feat(scan): flag avoided dishes`.

### Task 4: Recipe drafts (offline Gemini script) and seed

**Files:**
- Create: `backend/scripts/draft-recipes.ts`, `backend/scripts/recipe-draft-guard.ts`, `backend/src/modules/recipes/__tests__/recipe-draft-guard.test.ts` (test lives under `src` so vitest picks it up), `database/data/recipes.json`
- Modify: `database/scripts/build-seed.mjs` (+ test) to append recipe inserts (`dish_id` via `(select id from dishes where slug = ...)`)

**Interfaces:**
- `recipes.json`: `[{ slug, title, dish: <catalog slug>, minutes, servings, ingredients: [{ item, quantity }], steps: string[], reviewed: false }]`.
- `checkRecipeDraft(draft: unknown, catalogSlugs: Set<string>): { ok: true; recipe } | { ok: false; reason }` in `recipe-draft-guard.ts`: zod shape; `minutes` 5 to 240, `servings` 1 to 12, 3 to 15 ingredients, 3 to 12 steps; rejects text containing `kcal|calorie|healthy|cure|allerg|diabet|safe|weight loss|doctor|medic` (case-insensitive) or digits followed by `kcal`.
- Script: dishes = chicken-karahi, chicken-biryani, chicken-pulao, chicken-korma, chicken-tikka, aloo-gosht, mutton-karahi, beef-pulao, nihari, keema, kofta, palak-gosht, machli, fish-curry, chana-daal, maash-daal, mixed-daal, daal-kaddu, choley, lobia, bhindi, aloo-palak, mixed-sabzi, khichdi, kadhi-pakora, egg-fried-rice, raita. One Gemini call per dish (structured JSON, model from `GEMINI_MODEL`, 2 s pause between calls), guard each, write all accepted drafts with `reviewed: false`, print rejected ones. Reuse the request style of `backend/src/modules/scan/gemini.client.ts` (plain `fetch`, no new dependency).

- [ ] **Step 1:** Guard tests: `accepts a valid draft`, `rejects unknown dish`, `rejects "healthy"`, `rejects 450 kcal`, `rejects 2 steps`. Seed test: `recipes.json rows become inserts with reviewed false`, `unknown dish slug fails with the recipe slug`. Expect FAIL.
- [ ] **Step 2:** Implement guard, script, seed support.
- [ ] **Step 3:** Run `cd backend && npx tsx --env-file=.env scripts/draft-recipes.ts`; commit the resulting `recipes.json` (all `reviewed: false`). Regenerate `seed.sql`. If Gemini is unavailable, stop and report; do not hand-write recipes.
- [ ] **Step 4:** All tests pass. Commit `feat(recipes): Gemini recipe drafts for review and seed`.

### Task 5: Recipes module (ranking, list, detail, not-for-me)

**Files:**
- Create: `backend/src/modules/recipes/{index,recipes.routes,recipes.controller,recipes.service,recipes.repository,recipes.schemas,recipes.types}.ts`, `recipes/rank.ts`
- Modify: `backend/src/modules/index.ts` (mount at `/api/recipes`), `backend/eslint.config.mjs`, `meals/meals.service.ts` (+ `dishCounts`)
- Test: `recipes/__tests__/rank.test.ts`, `recipes.service.test.ts`, `recipes.route.test.ts`, `meals` service test for `dishCounts`

**Interfaces:**
- Consumes: `ProfilesService.getAvoids`, `getDailyBudget`, `isAvoided`; `MealsService.caloriesToday`, new `MealsService.dishCounts(userId, days = 30): Promise<Record<string, number>>` (confirmed slugs only, from `history(userId, days)`); `FeelService.getWeeklyPattern`; `NutritionService.listCatalog`, `portionFromDish`.
- `RecipeCard = { id, slug, title, dish: string, dishName, proteinType, minutes, servings, unit, kcalPerUnit: number, isEstimate: true }` where `kcalPerUnit = portionFromDish(dish, 1).calories`.
- `RecipeDetail = RecipeCard & { ingredients: {item, quantity}[]; steps: string[]; notForMe: boolean; avoided: boolean }`.
- `rank(input: { recipes: RecipeCard[]; avoids: Avoids; notForMe: Set<string /* recipe id */>; remaining: number; counts: Record<string, number>; heavy: { dishes: Set<string>; categories: Set<string> }; categoryOf: Record<string,string> }): RecipeCard[]` in `rank.ts`, pure. Algorithm:
  ```
  drop if isAvoided(avoids, {slug: r.dish, proteinType: r.proteinType}) or notForMe.has(r.id)
  rejected = recipes in notForMe
  score = (r.kcalPerUnit <= max(remaining, 0) ? 3 : 0)
        + ((counts[r.dish] ?? 0) >= 2 ? 1 : 0)
        - (heavy.dishes.has(r.dish) || heavy.categories.has(categoryOf[r.dish]) ? 2 : 0)
        - (rejected.some(x => x.dish === r.dish || (x.proteinType && x.proteinType === r.proteinType)) ? 1.5 : 0)
  sort by score desc, then kcalPerUnit asc, then title; take 20
  ```
  Weights are named constants at the top of `rank.ts`.
- Heavy set: from `getWeeklyPattern`, only when `state === 'pattern'` and `pattern.outcome === 'heavy'`; `kind` decides dish vs category.
- Routes: `GET /api/recipes` -> `{ recipes: RecipeCard[], remainingCalories: number, isEstimate: true }`; `GET /api/recipes/:id` -> `RecipeDetail` (404 if missing or not reviewed); `POST /api/recipes/:id/not-for-me` -> 204 (upsert, ignore duplicate; 404 if recipe not served); `DELETE /api/recipes/:id/not-for-me` -> 204 even if none. `:id` validated as uuid.
- A profile not set up (`getDailyBudget` throws `NotFoundError`): let it propagate as the same 404 the plan endpoint gives ("Set up your profile first").

- [ ] **Step 1:** Rank tests: Review Focus 1 and 3, `not-for-me recipe dropped and same-protein penalised`, `heavy dish demoted`, `often-eaten boosted`, `stable order by title`. Service tests: `empty profile` (no avoids, no meals, no pattern), `only reviewed recipes`. Route tests: list shape, uuid validation 400, POST twice 204, DELETE without row 204, user scoping on feedback writes. Expect FAIL.
- [ ] **Step 2:** Implement.
- [ ] **Step 3:** `npm test -w backend`, `npm run lint -w backend`, `npm run build -w backend` pass.
- [ ] **Step 4:** Commit `feat(recipes): ranked recipes and not-for-me`.

### Task 6: Frontend avoids (onboarding step and Profile section)

**Files:**
- Modify: `frontend/src/features/core/api.ts` (types `ProteinType`, `Avoids`, `getAvoids`, `putAvoids`; `ScanItem.avoided`), `onboarding/{store,content,screens}.tsx|ts` (`TOTAL_STEPS = 5`, `Answers.avoids: Avoids` default empty, new `AvoidsScreen` as step 4, budget becomes step 5, BudgetScreen calls `putAvoids(answers.avoids)` right after `putProfile` succeeds), `ProfileScreen.tsx` + `profile/content.ts`
- Create: `frontend/app/(onboarding)/onboarding/avoids.tsx`, `frontend/src/features/avoids/{avoids-view.ts,avoids-view.test.ts,AvoidsPicker.tsx,content.ts}`

**Interfaces:**
- `toggleProtein(a: Avoids, p: ProteinType): Avoids`, `toggleDish(a: Avoids, slug: string): Avoids`, `filterDishes(dishes: ApiDish[], query: string, limit = 8): ApiDish[]` (case-insensitive name match), `avoidsSummary(a: Avoids, nameOf: (slug) => string): string` (e.g. "Beef, Karela" or "Nothing yet") in `avoids-view.ts`.
- `AvoidsPicker({ value, onChange, dishes }: { value: Avoids; onChange(a: Avoids): void; dishes: { slug: string; name: string }[] })`: protein chips (six), then dish chips; with more than 12 dishes it shows a search field plus selected chips. Onboarding passes a fixed list from `avoids/content.ts` (karela, baingan, bhindi, kaleji, paye, machli, kofta, nihari, haleem, lobia, saag, ghiya) because the catalog endpoint needs sign-in; Profile passes `getCatalog()`.
- Profile: section "Foods I avoid" with the picker and its own Save button (`putAvoids`), independent of the profile form's dirty state.
- Copy: title "Anything you don't eat?", sub "We'll keep these out of your recipes. Skip if nothing.", never "allergy".

- [ ] **Step 1:** `avoids-view.test.ts` for the four helpers (toggle twice returns original, filter respects limit and case, summary empty). Expect FAIL with `npm test -w frontend`.
- [ ] **Step 2:** Implement; Skip and Continue both go to `/onboarding/budget`.
- [ ] **Step 3:** `npm test -w frontend`, `npm run lint -w frontend`, `npx tsc --noEmit -p frontend` pass.
- [ ] **Step 4:** Commit `feat(app): avoid list in onboarding and profile`.

### Task 7: Frontend scan review badge

**Files:** Modify `frontend/src/features/scan/ReviewScreen.tsx`, `scan/store.ts` or `scanPayload.ts` (carry `avoided`), `scan/content.ts`; test `scanPayload.test.ts`.

**Interfaces:** review items carry `avoided: boolean` from `ScanItem.avoided` (default false for manual picks). A chip with `avoided` shows a "You avoid this" tag; tapping the existing remove toggle removes it as today. No auto-removal.

- [ ] **Step 1:** Test `scan items keep avoided flag into review items`. FAIL, implement, PASS.
- [ ] **Step 2:** Frontend tests, lint, type-check pass. Commit `feat(app): show avoided dishes on scan review`.

### Task 8: Frontend recipes (list, detail, Today card)

**Files:**
- Create: `frontend/src/features/recipes/{api/recipes.ts,recipes-view.ts,recipes-view.test.ts,content.ts,RecipesScreen.tsx,RecipeDetailScreen.tsx,components/RecipeCard.tsx,components/TodayRecipes.tsx}`, `frontend/app/recipes/{_layout.tsx,index.tsx,[id].tsx}` (copy `app/meals/_layout.tsx`)
- Modify: `frontend/src/features/today/TodayScreen.tsx` (render `TodayRecipes` after `WeekCard`)

**Interfaces:**
- API: `getRecipes(): Promise<{ recipes: RecipeCard[]; remainingCalories: number; isEstimate: true }>`, `getRecipe(id)`, `markNotForMe(id)`, `undoNotForMe(id)`; types mirror Task 5.
- View: `cardLine(r): string` -> `"25 min · about 320 kcal per katori (estimate)"`; `columnsFor(width: number): 1 | 2` (2 from 900); `withoutRecipe(list, id)` and `restore(list, card, index)` for optimistic not-for-me with undo.
- Detail: ingredients list, numbered steps, "Not for me" button; after tap shows "Got it. We'll show this less." with Undo for 5 s, then returns to the list. Tags show protein type and "estimate".
- Today card: title "Recipes for you", top 3 cards, "See all" to `/recipes`; hidden when the list is empty; empty list screen says "No recipes yet. Check back soon."

- [ ] **Step 1:** `recipes-view.test.ts` for `cardLine`, `columnsFor(899)=1`, `columnsFor(900)=2`, remove and restore keep order. FAIL.
- [ ] **Step 2:** Implement screens with `HissaScreen`; list uses `useColumnLayout().columnMax` and `columnsFor(width)` for a wrapping two-column grid.
- [ ] **Step 3:** Frontend tests, lint, type-check pass. Commit `feat(app): recipes list, detail and Today card`.

### Task 9: Docs, contract and PRD diagram

**Files:** Modify `backend/README.md` (four endpoint groups and `ScanItem.avoided`), `docs/PRD.md` (v3 module row, status, Mermaid flow diagram of v1 to v3: photo -> Gemini names dishes -> confirm -> plan -> save -> streak / feel check-in -> pattern -> recipes ranking; avoid list as a hard filter on scan and recipes; buddy sees only streak), `docs/architecture.md` (recipes module and migration), roadmap and `2026-11-02-v2-status.md` (v3 section: built, not verified on a device, migration not applied to hosted, recipes need review).

- [ ] **Step 1:** Write docs; check the Mermaid block parses (no special characters in labels without quotes).
- [ ] **Step 2:** Root `npm test`, `npm run lint`, `npm run build`, `npm run test:data` pass. Commit `docs: v3 avoids and recipes`.
