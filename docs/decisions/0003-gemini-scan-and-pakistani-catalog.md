# 0003: Gemini scans, a Pakistani catalog in the database supplies the numbers

**Status:** accepted. Supersedes [0002](0002-gemini-names-tables-count.md).

**Context:** 0002 sent calories to FatSecret with a local table as fallback. Western databases cover desi home-cooked dishes poorly, and FatSecret Basic forbids long-term caching. We also compared training our own classifier with using Gemini (fine-tuned EfficientNet-B0 on the Kaggle photos against Gemini 3.1 Flash-Lite zero-shot with a closed class list plus "unknown"). Full table and limits: `docs/superpowers/specs/2026-11-01-ai-backend-design.md` section 4.1.

| Test                                  | Fine-tuned classifier | Gemini 3.1 Flash-Lite |
| ------------------------------------- | --------------------- | --------------------- |
| Kaggle held-out, 305 images           | 83.6% top-1           | 65.4%                 |
| 33 web photos (Wikipedia lead photos) | 64%                   | 94%                   |

Limits: the web set is small and famous dishes may have been in Gemini's training data; the Kaggle labels were scraped and not audited; neither set has real home-cooked phone photos, so accuracy on real meals is unmeasured.

**Decision:**

- Gemini only names dishes, from our catalog (structured output enum plus "unknown"), with a portion guess and a confidence. It never produces a calorie or macro number.
- Calories come from a `dishes` table in the database, seeded from `database/data/catalog.csv`: 78 dishes from Pakistani lab data (Khan 2019, 30 dishes) and a Pakistani paper (Farooq 2026, 48 dishes). INDB is used only for some portion weights. Sources: `docs/data-sources.md`.
- No model training in v1. The user chose Gemini after the comparison above. Accuracy and licensing are not gates for this hackathon; both are revisited before any public release.
- Each user may scan 10 times per PKT day (`SCAN_DAILY_CAP`, counted in `scan_log`). Over the cap, or when Gemini fails, the scan returns a manual fallback and the user adds dishes by hand.

**Consequences:** No third-party nutrition API and no runtime dependency on one. Dishes outside the catalog resolve to "unknown" and ask the user, as before. The catalog is only as good as its sources, so every number is labelled an estimate and each dish keeps its `source`, `basis` and `unit_basis`. Free-tier Gemini quota is shared, hence the cap. Real-photo accuracy is still unmeasured.
