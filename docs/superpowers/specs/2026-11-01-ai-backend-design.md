# Hissa: AI and backend design

Date: 2026-11-01. Status: approved by the user, 2026-11-01. Scope: the AI choice, the nutrition data source, the scan pipeline, and how the app learns each user. It builds on `docs/PRD.md` and `docs/architecture.md` and **supersedes** `docs/decisions/0002-gemini-names-tables-count.md` (FatSecret is dropped).

"Decided" marks what the user chose. "My call" marks what I chose. On 2026-11-01 the user approved the whole document, so my calls stand unless a later decision changes them. Two further decisions from the same message: licensing is not a concern (hackathon, not a public product), and dish accuracy is not a gate.

## 1. Intent

A user photographs the meal in front of them and sees, in under 10 seconds, which dishes the app thinks it is, an estimated nutrition breakdown, and a portion plan that fits the day's budget. Over time the app learns what the user avoids, eats often, and how they feel after eating, and uses that to suggest recipes (stretch).

Why this design: the PRD's nutrition API (FatSecret) is replaced by Pakistani research data, because desi home-cooked dishes are poorly covered by Western databases. The AI is kept to the one job it can do well (naming dishes from a fixed list), so that no unverifiable number ever comes from a model.

## 2. Goals, non-goals, anti-goals

**Goals**
- Photo to confirmed portion plan in under 10 s. The PRD's 80% dish-accuracy target is not a gate (decided: accuracy is not a concern for this hackathon); accuracy is measured and reported, not enforced.
- Every nutrition number traceable to a named source and labelled an estimate.
- Works on free tiers during the trial (see 6.3).

**Non-goals (v1)**
- Training or fine-tuning our own vision model. **Decided:** the user chose Gemini after seeing the head-to-head in 4.1, because no real home-meal photos could be sourced to settle it. Revisit only if the eval in section 8 shows Gemini below target on specific dishes.
- Barcode or packaged food, workouts, groups larger than two (PRD).
- A recipe engine beyond "standard open-source recipes, nothing too crazy". Recipes are a stretch goal, not must-ship. Decided.

**Anti-goals (failure even if it works)**
- Gemini or any model producing a calorie or macro number.
- Silently guessing a low-confidence dish instead of asking.
- Telling the user a food "suits your body" or "causes" anything. Copy says "pattern". Never medical advice.
- The buddy seeing meals, photos, calories or preferences (PRD).
- Treating "the user did not eat it" as "the user dislikes it".

## 3. Constraints

- 10-day plan; the scan flow must work end to end by day 5 (PRD gate).
- Free-tier Gemini (user's own AI Studio limits): `gemini-3.1-flash-lite` and `gemini-3.5-flash-lite` allow 15 requests/min and 500 requests/day. All regular Flash models allow only 20 requests/day, so they cannot serve testers or an eval. Pro models: 0.
- Free-tier Gemini content may be used by Google to improve its products. Decided: the user accepts this for the trial.
- Backend rules in `CLAUDE.md` apply (layering, module boundaries, external APIs behind injected clients, every query scoped to the user).

## 4. AI choice

**Decided (user, after the head-to-head in 4.1):** use **Gemini**, no model training in v1.

**My call:** default model `gemini-3.1-flash-lite`, configurable by env var, fallback `gemini-3.5-flash-lite`. The final model pick is made by the eval in section 8.

### 4.1 Head-to-head experiment (run 2026-11-01, throwaway scripts, not in the repo)

Fine-tuned EfficientNet-B0 (6 epochs on the Kaggle images, 61 classes, near-duplicate-safe split) against Gemini 3.1 Flash-Lite zero-shot with a closed class list plus "unknown".

| Test | Fine-tuned classifier | Gemini 3.1 Flash-Lite |
|---|---|---|
| Kaggle held-out, 305 images (same source as training) | 83.6% top-1, 94.1% top-5 | 65.4% top-1 (298 answered) |
| Wikipedia lead photos, 38 images of 36 dishes (different source) | 65.8% top-1 over 38 (64% on the 33 both answered) | 94% (31 of 33 answered by both; 5 calls failed on network) |

Reading, with limits:
- The classifier wins on photos that look like its training data and drops about 18 points on a different source, with absurd misses (haleem as rabri, nihari as pickle). Gemini generalised better.
- The Kaggle score for Gemini likely includes noisy or ambiguous scraped labels; not audited.
- The web test is small (33 to 38 photos) and flatters Gemini: Wikipedia lead photos are famous and may have been in its training data.
- Neither test used real home-cooked phone photos. The user could not supply them. Accuracy on real meals is therefore unmeasured; the user has decided this is not a concern.
- Classifier model is 16 MB and 8 ms per image on a laptop GPU; Gemini median latency was 2.7 s per call.
- The classifier also names one dish per photo and cannot say "none of these"; Gemini returns several dishes with confidence.

### 4.2 Why not the alternatives

- **Training our own classifier.** Measured in 4.1: better on Kaggle-like photos, worse on a different source. The Kaggle SmartFoodAnalyzer dataset has 14.7k images in 63 class folders (about 240 each), but its license is "Unknown", its provenance is blank, and the paper says images came from web scraping, YouTube thumbnails and volunteer photos. Using a model trained on it in a product is a licence risk. The PRD also puts model training out of scope. Gemini fine-tuning with images exists on Vertex AI (paid, needs Google Cloud) and was not tried.
- **Groq.** Its only documented vision model, `qwen/qwen3.8-27b`, is Preview (Groq says not for production), accepts at most 3 images per request, and documents JSON mode but not schema-enforced enums for images. Kept as an optional comparison in the eval only.
- **xAI Grok.** The user meant Groq; xAI was researched by mistake. Not pursued.
- **Gemma 4 (26B/31B) on the Gemini key.** Very large free quota (14.4K requests/day) but image input is unverified. Include in the eval only if it accepts images.

## 5. Nutrition data

Decided: replace FatSecret with Pakistani research data; "if a better source exists, use it; else use the paper".

### 5.1 Sources and precedence (decided plan, approved)

1. **Lab-measured** values: Khan et al. 2019, *Progress in Nutrition* 21(2), 30 Khyber Pakhtunkhwa dishes, AOAC proximate analysis in duplicate, per 100 g. Wins wherever a dish is covered.
2. **Paper table**: Farooq et al. 2026, *Nutrients* 18(19):3173, supplementary PDF, about 59 dishes (my count), per 100 g, calculated from USDA FoodData Central, cross-checked on 15 dishes (mean deviation 8.4%). Fills the rest.
3. **INDB** (Indian Nutrient Databank, Anuvaad/Jaacks, 1,014 recipes), hand-picked only: roti, naan, paratha, pulao, kheer, halwa, raita, lassi, kulfi, khichdi, daals, saag, fish curry. **Never** its fried, kofta or kebab rows (they count all frying oil as eaten: a potato samosa shows 814 kcal, chicken kebab 729 kcal/100 g).
4. **USDA FoodData Central** (CC0, 1,000 requests/hour per key): only for gaps, and only from the seed script, never at runtime.

My call: no fuzzy name matching. A hand-maintained mapping file lists, per catalog slug, which source row supplies it.

Known disagreement between sources (kcal/100 g, paper vs lab): bhindi 85 vs 158, mixed veg 90 vs 142, maash daal 172 vs 272, chicken biryani 195 vs 160, haleem 165 vs 128, chicken karahi 200 vs 241, nihari 220 vs 172. Likely cause (my inference): home cooking uses more oil than the calculated recipes assume. This is why lab values win and why every number is labelled an estimate.

### 5.2 Portions

No source gives household portion sizes. INDB gives a unit (chapati, naan, plate, bowl) and kcal per unit; dividing by kcal per 100 g gives grams per unit (my arithmetic: chapati about 36 g, naan about 53 g, fish-curry bowl about 254 g). For dishes INDB lacks (karahi, nihari, haleem) use a default unit size that the builder sets and marks `assumed`.

### 5.3 Catalog

Decided: for the MVP, use all dishes whose data is most available. Result: every dish that ends up with a value from the sources above, roughly 70 by my estimate. **My call:** a hand-picked list of hard-to-tell-apart dishes may be merged or dropped after the eval if the confusion rate is high.

### 5.4 Schema change (my call)

`dishes` today has `fatsecret_food_id` and `local_*` per-unit values. Change to:

- Remove `fatsecret_food_id`, `local_calories`, `local_protein_g`, `local_carbs_g`, `local_fat_g` and the check that needs them.
- Add `kcal_per_100g`, `protein_per_100g`, `carbs_per_100g`, `fat_per_100g` (all required), `source` (`khan2019`, `farooq2026`, `indb`), `basis` (`lab`, `calculated`), `unit_basis` (`derived`, `assumed`).
- Extend the `unit` check with `bowl` (INDB's unit; a katori is smaller, so do not rename it).
- Calories per portion = `kcal_per_100g * grams_per_unit * units / 100`. Computed in `nutrition`, never stored on `dishes`.

The seed is generated once by a script from the mapping file; the script may call USDA for gaps. Remove `fatsecret.client.ts` and the FatSecret env vars. `local-table.ts` becomes a repository read of `dishes`.

### 5.5 Licensing (not legal advice; decided: not a concern for this hackathon, revisit before any public release)

Kaggle images: license Unknown, so use them for internal eval only and never commit or redistribute them. Nutrition values are facts; copy them with attribution (Khan 2019, Farooq 2026, INDB paper CC BY, USDA FDC). The INDB GitHub repo has no LICENSE file; the INDB paper states CC BY. Credit all sources in the app's About screen and `docs/`.

## 6. Scan pipeline

```
app photo -> scan: resize, cap check, Gemini -> [{dish, portion_units, confidence}]
          -> app: correction chips for low confidence / unknown
          -> nutrition: per-100g x grams -> plan: fit to remaining budget
          -> meals: save predicted AND confirmed -> streaks: mark the PKT day
```

### 6.1 Gemini contract (existing `GeminiClient.detectDishes(photo, catalog)`)

- Structured output: JSON schema, `dish` is an enum of catalog slugs plus `"unknown"`, `portion_units` is a number in that dish's own unit, `confidence` is 0 to 1. Array may hold several dishes. No calorie or macro field exists in the schema.
- Image: send JPEG after the resize below (Gemini also accepts PNG, WEBP, HEIC and HEIF). Prompt text goes before the image (Gemini docs).
- **My call:** resize the longest side to 1024 px before sending to cut latency and tokens; confidence below 0.6 or `unknown` always asks the user. Tune the 0.6 from eval data.
- The client is injected into the service so tests mock it. Validate the response with zod; a malformed or empty response is treated as "unknown", never as an error shown to the user.

### 6.2 Plan and budget

Unchanged from the PRD: fit portions in roti, katori or plate steps to the remaining daily budget (Mifflin-St Jeor, needs sex, already in `profiles`). When the budget is used up, show a light plan (salad, raita, half portions), never "don't eat".

### 6.3 Rate limits

500 requests/day is shared by testers, dev and eval. **My call:** a per-user daily scan cap (default 10, env-configurable) counted in a small `scan_log (user_id, day)` table. Over the cap, or when Gemini returns 429 or fails, the user adds dishes by hand from the catalog; the scan flow never dead-ends. Eval runs happen off-peak and are counted against the same 500.

## 7. Learning the user

**My call (you said the Food and Feel answers should "train the AI for each user"; you did not decide how):** no model training. Learning means a per-user profile built from three kinds of signal, plus two explicit inputs the user approved.

| Signal | Source | Use | Weight |
|---|---|---|---|
| Avoids (decided) | One onboarding step: pick dishes and protein types to avoid (e.g. beef) | Hard filter in code, never left to a prompt | Absolute |
| "Not for me" (decided) | One-tap on a recipe card | Hard filter on that recipe and a soft penalty on similar ones | Strong |
| Eaten often | Count of confirmed dishes in `meal_items` | Weak "likes" signal. Silence is never a dislike | Weak |
| Feel patterns | `feel_checkins` joined to meals, PRD rule (one answer in 60% or more of a category's check-ins, at least 3 check-ins) | Weekly pattern card and recipe ranking | Medium |

**Schema (my call):** `user_avoids (user_id, kind in ('dish','protein'), dish_id nullable, protein text nullable)` and `dishes.protein_type` (`beef`, `mutton`, `chicken`, `fish`, `egg`, `veg`). "Eaten often" is a query over existing tables, not a new table.

**What the profile may do:** rank and filter recipes in code; supply context to Gemini only to word an explanation or the weekly pattern sentence. Gemini never invents a pattern, never ranks, never sees photos outside the scan call.

**Why code enforces the hard filters (my inference):** research on LLM preference-following (PrefEval, PersonaMem) exists because models drift from stated preferences over long contexts, and one Eat This Much user reported excluded foods still appearing. I have not verified the benchmark scores.

**Copy rule:** Feel results say "you often felt light after X", never "X suits your body". Applies to the app, the weekly card and recipe explanations.

## 8. Evaluation (decides the model)

- Build a 50 to 100 photo eval set restricted to catalog dishes, labelled by hand. Internal only, not committed. Mix sources: real phone photos of meals as soon as the team has any (they are the only valid test of the 80% target), plus Kaggle and web photos for volume. Report accuracy per source, never one blended number.
- Compare `gemini-3.1-flash-lite`, `gemini-3.5-flash-lite`, Gemma 4 (if it accepts images) and optionally Groq `qwen/qwen3.8-27b`. Also try adding a one-line description per dish to the prompt (untested; the experiment in 4.1 gave Gemini class names only).
- Record per model: top-1 dish accuracy, corrections per scan (counting unknown as a correction), latency (target under 10 s end to end), and failures.
- Decision rule: pick the cheapest or highest-quota model among those that score within a few points of the best. There is no pass mark (decided: accuracy is not a concern). Fine-tuning stays out unless the user decides otherwise.
- Already known (4.1): Gemini 3.1 Flash-Lite got 65.4% on Kaggle photos and 94% on 33 web photos.

## 9. Recipes (stretch)

Decided: standard open-source recipes, nothing complex, not must-ship.

Researched: `pakistani.recipes/api/recipes.json` has titles, region, times, servings and an ingredient count only: no ingredients, no steps, no nutrition, and no stated license. It cannot be the recipe source as is. **Open for the builder:** find an open recipe set with ingredients and steps and a clear license, or cut recipes. Do not scrape.

Mechanism once a source exists: the `recipes` table links each recipe to catalog dishes and protein type; ranking is deterministic (hard filters, budget fit, liked dishes, feel flags); `recipe_feedback (user_id, recipe_id, verdict)` stores "not for me".

## 10. Module changes

- `scan`: implement `gemini.client.ts` (real client), `scan.service.ts` (resize, cap, call, validate), route and schemas; add `scan_log` repository.
- `nutrition`: DB-backed per-100g lookup, portion maths, remove FatSecret.
- `profiles`: avoids CRUD, exposed through `profiles/index.ts` only.
- `plan`, `meals`, `streaks`, `feel`: no design change; `feel` uses the existing PRD rule.
- `database/`: one migration for 5.4 and 7, a generated seed, mapping file and seed script under `database/` or `scripts/` (builder's choice).
- Config: backend env names are `GEMINI_API_KEY` etc. The user's root `.env` uses `API_KEY_GEMINI`, `API_KEY_GROQ`, `API_KEY_FDC`; builder aligns them. Groq and USDA keys are needed only by the eval and seed scripts, so they are optional in `loadConfig`.

## 11. Risks

- **Look-alike curries get confused.** Accepted (accuracy is not a concern). The always-confirm step and manual entry cover wrong guesses.
- **Free-tier quota or terms change.** Mitigation: model name is config, manual entry exists, cap per user.
- **Data disagreement** between sources: labelled estimates, source shown in an info sheet.
- **Licensing** of the lab paper, INDB and Kaggle images is unclear. Decided: not a concern, since this is a hackathon project and not a public product. Revisit before any public release. Source columns stay so any source can be swapped.
- **Portion estimation from a single photo is unvalidated.** The paper reports no portion error. Gemini's portion guess is only a starting value for the user to confirm.

## 12. Left to the builder

File layout of the seed script and mapping file, exact resize library, prompt wording, the confidence threshold after the eval, default unit sizes for dishes without INDB units, how the app presents source and basis, and the recipe source (section 9).
