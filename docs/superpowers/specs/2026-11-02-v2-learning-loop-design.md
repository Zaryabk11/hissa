# Hissa v2: a personal learning loop with a buddy

**Status:** Draft for builder review and user approval. **Date:** 2026-11-02.

## Intent

Hissa already has a working v1 backend for estimating portions of desi meals. The hackathon version needs to become a usable phone app that helps a person return to logging, notice how whole meals relate to how they feel, and make a small choice to try next time. The intended progression is: on day 1, see a portion plan; by day 3, return with a buddy; by day 7, see an evidence-backed personal pattern. The day-1/day-3/day-7 framing comes from competition notes supplied by the user, not a verified scoring rubric.

The user's highest priority is speed to a real, demonstrable experience. Their partner owns the v1 screens and landing page. This work owns the shared Google sign-in path and basic, replaceable v2 Expo screens, the necessary backend and database behavior, and a release path. The v2 design supersedes the older backend-only v2 scope in `docs/superpowers/plans/2026-11-01-roadmap-v1-v2-v3.md` and pulls a narrow Food & Feel slice forward from v3.

## Existing state and constraints

- The v1 Express API, Supabase schema, 78-dish catalog, Gemini scan, plan, and meal save exist. The Expo routes are placeholders; `auth`, `streaks`, and `feel` backend modules return 501. Meal save does not yet write `streak_days`.
- `buddy_pairs`, `streak_days`, and `feel_checkins` exist. The current `streak_days_read` RLS policy exposes historical streak days to an active buddy through direct Supabase access. It must be narrowed to owner-only reads; buddy data must go through a minimal API response.
- Follow `AGENTS.md`: backend route → controller → service → repository, module imports through `index.ts`, external Gemini calls behind injectable clients, and every service-role query scoped to the authenticated user. Gemini's existing catalog-only rule applies to scanning; the user has explicitly expanded its role to draft Food & Feel questions under the constraints below. Gemini still never supplies calorie numbers.
- Every user-facing numeric quantity is labelled an estimate, as `AGENTS.md` requires; invite codes are identifiers rather than quantities. No medical diagnosis, causal food claim, or prescribed food elimination. A buddy sees only whether their partner logged today and the shared streak, never meals, photos, calories, feelings, or experiments.
- Supabase project ref is `zvhwzekbgmuaaiepkcwn`. The user authenticated the Supabase MCP server in their Codex CLI; this session has not independently verified the remote Google provider, redirect allowlist, or migrations. Implementation must verify them before claiming live auth.
- Expo SDK is currently `~58.0.21`. The app must be tested on the latest available Android and iOS releases at implementation time, not merely claim support from a framework version.

## Goals and acceptance

1. Two real Google users can sign in to the same Expo app, complete the existing v1 meal flow when the partner's screens are ready, and use the v2 buddy and Food & Feel flows. Supabase Auth owns sign-up and sign-in; the Expo client persists and refreshes sessions and sends the bearer token to the API.
2. One user can create a six-character invite code and share a link or code. A second signed-in user can preview and accept or decline it. The app supports one active buddy per person. A shared streak counts a PKT day only after both saved at least one real meal. When the buddy has not logged today, one in-app nudge per sender per PKT day is visible when the buddy next opens the app.
3. At least 90 minutes after a saved meal, its owner can answer the short Food & Feel check-in. The first questions are simple; a later check-in may add one optional targeted question when their history makes it useful. The options are explicit and skippable. The same meal can have only one completed check-in.
4. The private weekly card appears only after at least seven real check-ins overall, and shows a pattern only when supported by the PRD's minimum of three relevant check-ins and 60% consistency rule. It describes the *whole meal* for a single observation. Across several meals with a shared confirmed dish, it may say “meals containing raita” with numerator and denominator, never that raita caused a symptom. Show insufficient-data states honestly.
5. A person can choose one small “try next time” action for themselves and review whether a later meal felt different. This is a private experiment, not an automatic food ranking or medical recommendation.
6. An Android APK can be installed outside the Play Store. iOS is tested in a current simulator and, if available, on an iPhone connected to a Mac using a free Apple Personal Team. The iOS install expires after seven days and is not a remote evaluator distribution path. The partner's web page remains a landing page, with an Android install link and app-link/code handoff. No public store release is part of the hackathon.
7. The API must eventually be reachable at public HTTPS for remote APK evaluators. Railway is the proposed Express host. **Deployment execution is on hold at the user's request**; prepare configuration and owner handoff, but do not deploy until the user resumes it. The user's current collaborator role cannot deploy to the intended project; the owner can grant the required role or deploy the prepared release.

## Non-goals and anti-goals

- No push notifications, 9 p.m. reminders, chat, groups, leaderboard, activity tracking, recipes, wearable data, Urdu UI, or website app. The partner is building the landing page and v1 visual design.
- No pooled cross-user symptom model in v2. No automatic diagnosis of lactose intolerance or other condition. No inference that an ingredient was present unless a confirmed catalog dish or verified catalog data supports it.
- No synthetic symptom record may appear as a real user's evidence. No result may imply that synthetic-data performance validates real-world food or symptom prediction.
- A failed Gemini call, sparse data, or an invalid generated question must not block a check-in or produce an unsupported claim.

## Approaches considered

| Approach | Benefit | Cost or risk |
| --- | --- | --- |
| **Chosen: complete vertical learning loop** — connect Google auth, real meal saves, buddy, check-ins, patterns, and a basic Expo surface in working slices | First real two-person demo arrives early; each slice can be shown and tested | Requires coordination with the partner's v1 screens and a shared API contract |
| Backend modules first, then Expo | Matches the older roadmap and isolates server work | Delays a usable phone demo and leaves high integration risk until the end |

Within the chosen approach, the user chose a hybrid learning design: real user data updates a personal statistical model; rules choose the evidence and permitted answer sets; Gemini drafts a focused question from a bounded summary. The user chose per-user learning after asking us to recommend the best approach. These are design calls subject to approval, not claims that a medical prediction model is trained or validated.

## User flows

### Shared sign-in and install

The Expo app offers Google sign-in/sign-up only. Supabase redirects back to the app's `hissa` scheme; a callback route completes the session. The same session opens the v1 and v2 areas. Deep-link invite codes survive sign-in. Android evaluators install an APK; iOS testing uses Simulator or direct Mac-to-iPhone installation. A public HTTPS API URL and the Google redirect configuration must be finalized before remote evaluator use. The landing page is owned by the partner and only hands off the Android install link, app link, or code; no product functions run on web.

### Buddy

The inviter creates a pending pair with a unique six-character code. Sharing sends an app link containing that code plus the code itself as a manual fallback. The recipient opens the link or enters the code, sees an invitation preview, then accepts or declines. Decline closes the pending invitation. Existing open/active-pair constraints are enforced server-side under concurrent requests. After acceptance, the Buddy screen shows a shared streak, each person's `loggedToday` state, and a nudge button only while the buddy has not logged today. A sender may nudge once per PKT day; the recipient sees it on their next app open. There is no background delivery or push. The pair may be ended, after which neither user receives buddy status.

Saving a meal writes that user's PKT `streak_days` row idempotently through the streaks module public API. The shared streak is calculated from consecutive days on which both have a row. If yesterday was incomplete, the displayed streak is zero from the next PKT day; an in-progress today does not erase an otherwise completed streak. The buddy read API returns only `loggedToday` and `streak` information needed by the screen. A migration removes the direct-client historical buddy read policy.

### Food, feeling, and the next question

A saved meal becomes check-in eligible after 90 minutes. With no push, the app surfaces the oldest eligible uncompleted meal when the user next opens it; it shows meal time and confirmed dishes only to that meal's owner. The baseline asks energy (`low`/`okay`/`good`) and stomach (`heavy`/`fine`/`light`), preserving the current PRD. If the user reports discomfort, one optional symptom detail can distinguish `bloated`, `upset`, `other`, or `not sure`; subsequent check-ins may instead ask a more focused question. Skip is always allowed. A check-in more than one day after a meal is not used for food/feeling associations, because recall and intervening meals make attribution weak. The exact UI copy and visual styling are left to the partner; the v2 screens expose plain components and API states.

Each completed real check-in updates a **per-user online statistical model** (or its equivalent on-demand aggregate): observations are whole meals, confirmed catalog dish sets, timing, portion context, and responses. It maintains evidence counts and uncertainty for candidate questions, including comparisons with meals without a candidate dish. A single mixed meal never identifies a culprit. Repeated raita-containing meals may become a candidate association only after enough exposed and comparison observations. No disease probabilities are computed or displayed.

The selector ranks approved question types by whether a user answer would clarify an uncertain, repeated pattern. Train a small offline question-ranking model on **labeled synthetic meal histories with known simulated patterns**, then test it on held-out scenarios. Its scoring is updated or recomputed from each real user's data. Synthetic training is for the *question-selection behavior* and demo/test fixtures, not a trained food-intolerance predictor. Compare it with a fixed-question baseline and real tester review; if it does not improve question relevance, keep the transparent statistical selector in the release and report the measured result. The app must not claim clinical accuracy from synthetic evaluation.

The backend sends Gemini only the top candidate, a compact aggregate evidence summary, and the allowed question type/option IDs. Gemini may draft the question and order/word the supplied options through structured output. The backend validates schema, option IDs, and that the wording is consistent with the evidence and contains no diagnostic or causal claim. If generation fails validation, use a fixed approved question and options. The generated text is never used to derive a numerical pattern or health conclusion. This changes the current Gemini rule in `AGENTS.md` and product docs; implementation must document the new bounded role explicitly.

### Weekly pattern and user-chosen experiment

For ordinary users, the weekly card uses only their real check-ins from the last seven PKT days. It appears after at least seven check-ins in that window and then describes whole-meal patterns where at least three check-ins support an outcome in at least 60% of the relevant group, as the PRD requires. A dish co-occurrence card needs repeated exposed and comparison meals, and states the observed counts on both sides; with too few comparisons, it stays a question rather than a result. Example: “You reported bloating after 4 of 5 meals containing raita. You have 2 comparable meals without it, so this is still worth exploring.” This is an observation, not a diagnosis or a recommendation to eliminate dairy. A designated demo-only Google account may show the same card computed from its own clearly labeled synthetic history; its rows never enter an ordinary user's evidence or model.

From a card, the user can save a single private “try next time” choice, such as choosing a smaller portion or comparing a different side. The app surfaces it on a later relevant meal and lets the user mark whether they tried it. It does not assert that the change caused a later feeling.

## Data and module changes

- `frontend/`: shared Supabase session/client and API bearer-token path; sign-in callback; simple Buddy, eligible check-in, weekly pattern, and experiment states. Work in feature folders and coordinate route ownership with the partner.
- `backend/src/modules/streaks/`: invite preview/create/accept/decline/end, nudge, public streak read, idempotent mark-on-save; all user-scoped through route/controller/service/repository.
- `backend/src/modules/feel/`: due check-in, response validation, personal pattern evidence, question selection, Gemini question client, weekly card, and experiment endpoints; deterministic fallback when Gemini is unavailable.
- `backend/src/modules/meals/`: invoke the streaks public API after a successful real meal save without crossing module internals. Keep idempotence and error handling explicit so a meal cannot silently create a false streak.
- `database/supabase/`: migrate declined invitation and nudge storage; add only the minimum structure for symptom detail, adaptive question/answer provenance, and one private experiment; narrow `streak_days` RLS to owner-only. Migration should be repeatable and preserve existing real data.
- Release: Railway-ready backend build/start settings and an environment variable handoff; EAS Android APK profile; iOS simulator/direct-device instructions; no deployment execution while held.

## Verification and demonstration

- Test real Google session creation and refresh, two real users accepting/declining an invite, the one-buddy limit, cross-user isolation, one nudge per day, and consecutive PKT streak boundaries. Confirm buddy responses and direct RLS never reveal meals, photos, calories, feelings, experiments, or historical streak rows.
- Test the whole-meal attribution rule, sparse-data suppression, repeated-dish comparison, synthetic-vs-real isolation, invalid Gemini fallback, allowed option sets, and no medical or causal copy. Verify the trained selector against a fixed-question baseline; do not claim success without measured evidence.
- Check Android APK on a real Android device and current emulator; check iOS on the latest available simulator and a directly connected iPhone if available. Check OAuth and invite deep links on both. Record exact OS/device/build versions in evidence.
- Run `npm test`, `npm run lint`, `npm run build`, and an authenticated hosted end-to-end smoke test when deployment resumes. Until then, record that remote APK use is blocked by the held API deployment.
- Keep prompts and final agent responses in `.claude-logs/` and commit them with changes. Make a short voiced demo after each working vertical slice; prepare daily accomplishment/next/blocker updates and recorded pair-session evidence for the team to post. The supplied competition notes require these artifacts, but their numerical weighting is unverified.

## External decisions and risks

- The user has paused deployment. Resuming it requires the user or project owner to authorize the final Railway action and provide an Editor-capable identity or run the prepared handoff. An APK installed remotely will not work against a localhost-only API.
- The remote Supabase Google provider and redirect configuration have not been inspected in this session. The implementation plan must verify them with Supabase MCP or the project dashboard before promising sign-in.
- A labeled synthetic simulator can test question-selection logic but cannot establish real food/feeling relationships. Real users will have sparse and confounded data; the product should ask a better question when evidence is weak and show a card only when the underlying counts justify one.
- Two weeks of demo history should be seeded into a designated team-owned, demo-only Google account after sign-in, clearly labeled as sample history, and kept separate from ordinary user evidence. The demo account is never used as a real tester and its data is never pooled into another user's model. Credentials and real `.env` files stay out of the repository. The exact demo account can be supplied during implementation; the design does not depend on its address.

## Builder choices left for the implementation plan

Choose minimal API route names, exact migration column names, a small reproducible synthetic simulator and question-ranker implementation, and plain Expo component structure within the repo's architecture. Keep the fixed-question fallback functional even if the trained ranker performs no better than baseline. Coordinate auth and app routes with the partner before modifying their v1 screens or landing page. The plan must explicitly direct every coding agent to use Superpowers, Ponytail, and Graphify and include small working demonstrations, logs, tests, and privacy checks in each vertical slice.

## Sources used for constraints

- Product requirements: `docs/PRD.md`, `docs/Portion Coach PRD.pdf`, `docs/architecture.md`, and `AGENTS.md` in this repository.
- [Expo Go SDK compatibility](https://docs.expo.dev/troubleshooting/expo-go-version-mismatch/) and [Expo OAuth guidance](https://docs.expo.dev/guides/authentication/) explain why Expo Go is not the iOS evaluator path for this SDK and Google sign-in.
- [Apple Personal Team rules](https://developer.apple.com/help/account/basics/about-your-developer-account) explain direct iPhone installs and seven-day provisioning.
- [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output?lang=rest) support bounded question output, with application-side validation still required.
- [NIDDK lactose intolerance guidance](https://www.niddk.nih.gov/-/media/Files/Digestive-Diseases/Lactose_Intolerance_508.pdf) explains why digestive symptoms alone cannot establish a diagnosis. [Synthetic health-data assessment](https://pmc.ncbi.nlm.nih.gov/articles/PMC13689268/) documents limits of synthetic-data validation.
- [Railway project roles](https://docs.railway.com/projects/project-members) describe the owner/editor deployment handoff.
