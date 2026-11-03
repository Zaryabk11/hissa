# AI model training and Gemini tests

Run on 2026-11-01. This records what we tested and where the results are; it does not claim accuracy on home-cooked phone photos.

## Vision-model comparison

**Inputs and tools used**

- **Training and held-out set:** Kaggle SmartFoodAnalyzer images (`archive.zip`, extracted to `SMF-DataSet-Flat/`). The local split has 61 dish classes, 14,392 training images and 305 held-out images. `exp/split.py` grouped near-duplicates with perceptual hashes before splitting, then selected five test clusters per class.
- **Different-source test:** 38 Wikipedia lead photos covering 36 dishes, listed in `web/web_split.json`. Five Gemini calls failed, leaving 33 answered photos. Neither set contains team-taken meal photos.
- **Classifier:** ImageNet-pretrained `timm` EfficientNet-B0, fine-tuned for six epochs on a Mac GPU (MPS). `exp/train_cnn.py` used PyTorch/torchvision, 224 px crops, AdamW and cross-entropy loss; the split used Pillow, ImageHash and tqdm. The saved checkpoint is `exp/cnn_out/effnet_b0.pt` (16 MB).
- **Gemini evaluation:** `exp/eval_gemini.py` called `gemini-3.1-flash-lite` through `generateContent`. It sent JPEG images resized to at most 1024 px, a closed class list plus `unknown`, and a JSON response schema for `dish` and `confidence`. This experiment measured dish naming, **not portion accuracy**. The key came from ignored root `.env` (`API_KEY_GEMINI`); no key is in the results.

| Test                        | Fine-tuned EfficientNet-B0                     | Gemini 3.1 Flash-Lite                                                  |
| --------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------- |
| Kaggle held-out, 305 photos | 83.6% top-1; 94.1% top-5; 8.2 ms/image on MPS  | 65.4% top-1 of 298 answered; 7 errors; 2.75 s median/call              |
| Wikipedia, 38 photos        | 65.8% top-1 of 38; 64% on the 33 both answered | 31/33 answered correctly (93.9%); 5 network errors; 2.61 s median/call |

On the same 298 answered Kaggle photos, the classifier scored 83.2% and Gemini 65.4%. Gemini reported confidence of at least 0.9 on 264 of those photos, but was correct on only 185 (70%); it answered `unknown` 17 times. The classifier did better on Kaggle-like photos; Gemini did better on the small different-source set and can name several dishes in one photo. The Kaggle labels were not audited, Wikipedia photos may be familiar to Gemini, and neither result predicts accuracy on real household plates. We chose Gemini for v1; the classifier was not deployed.

## Gemini API and app checks

- The [client tests](../backend/src/modules/scan/__tests__/gemini.client.test.ts) use mocked HTTP responses. They check image encoding, catalog-only JSON schema (`dish`, `portion_units`, `confidence`), valid and malformed answers, off-catalog `unknown`, 429/503 and retry behavior, timeout/network failures, and safe error logging. Test-run pass/fail output is printed by Vitest, not kept as a separate report.
- The [scan service tests](../backend/src/modules/scan/__tests__/scan.service.test.ts) cover resized photos, low-confidence confirmation, no recognition, scan cap and manual fallback. A hosted Supabase plus real Gemini [end-to-end API run](superpowers/plans/2026-11-01-v1-portion-coach.md#task-10-end-to-end-check-and-api-contract) checked profile → catalog → scan → plan → saved meal → today's log; no committed raw HTTP transcript was found.
- The production [Gemini client](../backend/src/modules/scan/gemini.client.ts) asks only for catalog dish names, portion units and confidence. Nutrition values come from the database catalog, never Gemini. Its model is configurable with `GEMINI_MODEL`; the vision comparison above used `gemini-3.1-flash-lite`, and the default is now `gemini-flash-lite-latest` (see the latency findings below and [decision 0005](decisions/0005-gemini-timeouts-retries-and-model.md)).
- The root `Gemini-API - Sheet1.csv` was a historical API-quota sheet used during model selection, **not** an accuracy result. Quotas may change.

## Saved experiment files

These files were kept in a **temporary, untracked** scratch directory outside the repository. They may already be gone; nothing in the repo depends on them. If they still exist, this is where they were:

`/private/tmp/claude-501/-Users-sobanahmad-Work-8x-hackathon-hissa/1552c292-3466-48ec-bbc1-536015265170/scratchpad/`

| Path under that root                                                                            | Contents                                                         |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `exp/split.json`, `exp/split.log`, `exp/split.py`                                               | Near-duplicate-safe Kaggle split and script                      |
| `exp/train_cnn.py`, `exp/train.log`, `exp/cnn_out/cnn_results.json`, `exp/cnn_out/effnet_b0.pt` | Training script/log, per-image classifier results and checkpoint |
| `exp/eval_gemini.py`, `exp/gemini_31fl.log`, `exp/gemini_31fl.json`                             | Gemini evaluation script/log and per-image Kaggle predictions    |
| `web/web_split.json`, `web/keep/`, `web/cnn_web.json`, `web/gemini_web.json`                    | Web test labels/photos and both models' per-image results        |

The committed [design comparison](superpowers/specs/2026-11-01-ai-backend-design.md#41-head-to-head-experiment-run-2026-11-01-throwaway-scripts-not-in-the-repo) and [decision record](decisions/0003-gemini-scan-and-pakistani-catalog.md) preserve the summary. A larger 50–100 photo catalog evaluation, real phone-photo testing, Gemini 3.5/Gemma/Groq comparisons and confidence-threshold tuning were planned but **not run**.

## Separate synthetic question-ranker training

This is unrelated to the vision comparison: [train-question-ranker.ts](../backend/scripts/train-question-ranker.ts) trained on 2,000 synthetic users and held out 500. The generated [question-weights.ts](../backend/src/modules/feel/question-weights.ts) stores weights and a `trainingReport`: top-question accuracy 0.782 versus a fixed baseline of 0.664. It tests question selection on synthetic data, not food recognition, symptom prediction or clinical validity.

## Gemini latency and model findings (2026-11-02)

Measured against the real API with the production client and dataset photos, after the app showed "Photo scans are unavailable right now" although Gemini was working:

| Model                      | What was measured                                                                   | Result                                                                                                                                                        |
| -------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gemini-3.1-flash-lite`    | 12 scans with a 90 s timeout; then 20 calls side by side with other models          | 1 to 3 s typical, but 5 of 20 calls took 15 to 72 s (worst 72 s), in bursts; 2 of 20 failed with 503                                                          |
| `gemini-flash-lite-latest` | the same 20 side-by-side calls, then 20 varied scans end to end, then 8 paced scans | never over 3.5 s in the side-by-side run; 18 of 20 back-to-back scans succeeded (the 2 failures were quota 429s); 8 of 8 paced scans succeeded, slowest 2.5 s |
| `gemini-3.5-flash-lite`    | the same 20 side-by-side calls                                                      | never over 2.0 s; 3 fast failures (503)                                                                                                                       |
| `gemini-2.5-flash-lite`    | 8 calls                                                                             | HTTP 404 for this key                                                                                                                                         |

The free tier also enforces a per-minute request quota per model (`GenerateRequestsPerMinutePerProjectPerModel-FreeTier`; the API asked to retry after 3 s and calls worked 30 s later). Repeated bursts of 20 scans reach it. Dish-naming accuracy was **not** compared between models in this run (accuracy is not a gate for the hackathon); the partner's real aloo qeema photo came back as the nearest catalog dish, `kachalo-qeema`, with 0.95 confidence. The fix (10 s per-attempt timeout, up to 3 attempts, the lite alias as default) is recorded in decision 0005. One sample window per measurement, so treat the numbers as indicative.

## Check-in question wording (v2 Task 7)

`cd backend && npx tsx scripts/sample-questions.ts` prints each question next to the aggregate summary Gemini was given. With no `GEMINI_API_KEY` it replays 10 canned drafts (a mix of good and deliberately unsafe wording) through `FeelService.getQuestion` for three histories; with a key it calls Gemini 3 times per history. **No real Gemini output has been inspected yet** (no key was available when this was written), so the checks below describe the guard, not the model.

- Rejected as intended: a diagnosis ("lactose intolerant"), a number ("After 3 raita meals"), a causal claim ("Did the raita cause..."), advice ("should you avoid dairy"), a pre-meal question for the wrong intent, and a question about something else ("What did you eat before this meal?").
- False rejections (safe but refused, so the fixed question is shown): casual wording with none of the words "stomach" or "discomfort" ("Is your tummy upset?"), and any draft that uses a word on the denylist for an innocent purpose ("most", "every", "both", "try", "condition"). This costs variety, not safety.
- Known limit: the guard checks shape and forbidden words, not meaning. A fluent draft such as "How is your stomach feeling right now?" is accepted although it is not quite the same question as the fixed one. Review real Gemini samples before calling the wording "meaningful"; schema validation alone does not show that.
