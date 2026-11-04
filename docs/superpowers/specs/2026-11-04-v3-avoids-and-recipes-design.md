# Hissa v3: avoids and recipes (design)

Date: 2026-11-04. Status: **draft, awaiting approval**. Builds on `2026-11-01-ai-backend-design.md` sections 7 and 9 (which already decided the model) and the v2 status doc. Nothing in v3 exists in code yet (checked 2026-11-04: no `user_avoids`, `protein_type` or recipes anywhere on any branch).

"Decided" = the user chose it. "My call" = I chose it; change it if you disagree.

## 1. Intent

v1 tells you how much to eat, v2 learns how you feel. v3 makes the app respect what you will not eat and suggest meals you would. A user says once "no beef, no karela"; the app never plans or suggests those. Recipes give the portion plan something to act on at home. "Not for me" is one tap and remembered.

## 2. Goals, non-goals, anti-goals

**Goals**
- Avoid list set in onboarding and editable in Profile. Enforced in code, never in a prompt (decided, spec 7).
- Recipe list ranked deterministically for the user, with a detail screen (ingredients, steps) and a one-tap "not for me" (decided).
- Backend and every new screen agree on one contract; screens work on a phone and in a wide browser window.

**Non-goals**
- No model training or personalised ML (decided, roadmap).
- No recipe photos, user-written recipes, shopping lists, meal plans or scaling beyond stated servings.
- No new calorie source: recipe nutrition per serving comes from the linked catalog dish.
- No deployment, no migration on the hosted project (held by the user).

**Anti-goals** (failure even if it works)
- An avoided dish or protein appearing in a recipe list, however the ranking falls out.
- Silently dropping a dish the user photographed. Scan flags it and asks (PRD: never silently guess).
- "Not for me" or "not eaten" treated as a medical or allergy statement. Copy never says allergy, safe, suits you, or causes.
- A buddy seeing avoids, recipes or feedback.
- Gemini ranking, filtering, or supplying numbers. It only drafts recipe text once, offline.

## 3. Constraints

- Backend rules in `CLAUDE.md`: routes -> controller -> service -> repository, cross-module only through `index.ts`, every query scoped to the user, clients never write these tables directly (decision 0006; new tables get select-only owner policies and no write grants).
- Every number shown is an estimate.
- Hosted Supabase stays untouched; migrations are verified on a throwaway local Postgres.
- Free-tier Gemini quota: the recipe drafting is a one-off script, not a runtime call.

## 4. Decided by the user

- Avoids: onboarding step picks dishes and protein types; hard filter in code.
- "Not for me": one tap on a recipe; hard filter on that recipe, soft penalty on similar ones.
- Recipes are in scope (2026-11-04).
- Recipe source: **Gemini drafts them once and a human reviews before they are seeded** (2026-11-04).
- Produce a PRD diagram covering the product.

## 5. Design

### 5.1 Data (one migration `20261104000000_v3_avoids_recipes.sql`)

| Table / column | Shape |
| --- | --- |
| `dishes.protein_type` | text, check in `beef, mutton, chicken, fish, egg, veg`, nullable for dishes with no protein focus (e.g. roti, raita). Backfilled for all 78 dishes via `database/data/catalog.csv` and `build-seed.mjs`, plus an `update` in the migration so existing databases get it. |
| `user_avoids` | `user_id`, `kind` in (`dish`,`protein`), `dish_id` nullable fk, `protein` nullable; check that exactly the field matching `kind` is set; unique per user and value. |
| `recipes` | `id`, `slug` unique, `title`, `dish_id` fk to the catalog dish it makes, `protein_type` (copied from the dish at seed time), `minutes`, `servings`, `ingredients` jsonb (`[{item, quantity}]`), `steps` jsonb (`[text]`), `reviewed` bool. |
| `recipe_feedback` | `user_id`, `recipe_id`, `verdict` = `not_for_me`, `created_at`; unique per user and recipe. |

RLS: owner select on `user_avoids` and `recipe_feedback`; select-only for `recipes` (any authenticated user). No insert/update/delete grant to `authenticated` on any of them. My call: only `reviewed = true` recipes are served.

### 5.2 Backend modules

- **`profiles`** (extend): `GET /api/profiles/me/avoids` returns `{ proteins: string[], dishes: string[] }` (dish slugs). `PUT` replaces the whole list (idempotent, simplest for the client). `profiles/index.ts` exposes `getAvoids(userId)` and a pure `isAvoided(avoids, dish)` helper for other modules.
- **`scan`** (small change): each returned item gets `avoided: boolean` computed from the profile. Items are never removed; the app asks the user.
- **`recipes`** (new module): 
  - `GET /api/recipes` returns up to 20 ranked cards.
  - `GET /api/recipes/:id` returns detail.
  - `POST /api/recipes/:id/not-for-me` and `DELETE` (undo).
  - Ranking is a pure function in the service, order of operations: (1) drop avoided dish or protein and anything marked "not for me"; (2) score = budget fit (the dish's kcal per serving against remaining calories today) + a weak boost for dishes the user logs often + a demotion for dishes in the user's heavy-stomach pattern + a soft penalty for sharing a protein or dish with a "not for me" recipe. Weights are constants in one file with tests. My call: budget fit dominates, the rest break ties.
  - Reads other modules only through `index.ts` (profiles, meals, feel, nutrition).
  - Every card shows `estimate: true` kcal from the catalog dish.
- **Offline script** `backend/scripts/draft-recipes.ts`: asks Gemini to draft title, minutes, servings, ingredients and steps for the chosen catalog dishes with a fixed JSON schema (no calories, no health claims), writes `database/data/recipes.draft.json` for human review. After review the file is converted to `recipes.csv` and seeded by `build-seed.mjs`. A word allowlist check (reuse the question-wording guard idea) rejects health claims.

### 5.3 Frontend

Routes follow the existing Expo Router layout; no new tab (five slots are full).

| Screen | Route | Notes |
| --- | --- | --- |
| Onboarding: "What don't you eat?" | `(onboarding)/onboarding/avoids` | After the last existing step, skippable. Protein chips plus a dish search picker. Saved with the profile submit. |
| Profile: "Foods I avoid" | in `/profile` | Same picker, saves through the avoids endpoint. |
| Scan review badge | `(scan)/review` | "You avoid this" badge on avoided items with Remove and Keep buttons. |
| Today: "Recipes for you" card | `/(tabs)/today` | Top 3 and "See all". |
| Recipes list | `/recipes` | Cards: title, minutes, estimated kcal, protein tag. |
| Recipe detail | `/recipes/[id]` | Ingredients, steps, "Not for me" with a 5 second undo. |

Responsive rule (applies to all new and touched screens): single column on phones; centred column capped near 560 px on tablets and desktop browsers; recipe list becomes two columns from 900 px; tap targets at least 44 px; content respects safe areas; no horizontal scroll at 320 px width. Each screen gets a view-model file with unit tests like the existing `*-view.ts` pattern, and I will check layout in the browser at 360, 768 and 1280 px.

### 5.4 Contract kept in one place

`backend/README.md` gets the four new endpoint groups and the `avoided` field; the frontend API client types mirror it. A contract test on each side uses the same example payload.

### 5.5 PRD diagram

`docs/PRD.md` gets a Mermaid diagram of the whole product (v1 to v3 flow, who sees what, where Gemini is allowed) and a v3 module row. My call: Mermaid in the markdown so it renders on GitHub and stays diffable.

## 6. Left to the builder

Exact list of ~25 recipe dishes (pick the most commonly logged home dishes), copy wording, ranking weights, the dish picker's search behaviour, exact breakpoints beyond the rule above.

## 7. Risks

- Gemini-drafted recipes can be wrong or generic. Mitigation: nothing is served until a human flips `reviewed`; I will give you the draft file to review before seeding.
- `protein_type` for mixed dishes (e.g. aloo gosht) is a judgement; I will list every mapping in the PR for you to check.
- Hosted database lacks the v2 migrations 0005 and 0006 and will lack v3's; deployment stays held, so v3 runs locally only.
