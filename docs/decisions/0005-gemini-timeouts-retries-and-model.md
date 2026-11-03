# 0005: Short Gemini timeouts with retries, and the lite alias as the default model

**Status:** accepted (2026-11-02). Supersedes the model choice in [0003](0003-gemini-scan-and-pakistani-catalog.md) (still `Gemini names dishes only`); the evaluation record is in `docs/ai-model-and-gemini-tests.md`.

**Context:** The app showed "Photo scans are unavailable right now" although Gemini worked. Measured with the same photo and the production client: `gemini-3.1-flash-lite` usually answered in 1 to 3 s, but 5 of 20 calls took 15 to 72 s, in bursts. The backend gave up at 20 s and only retried a 503, so about 1 scan in 6 fell back to manual entry. In the same window `gemini-flash-lite-latest` never exceeded 3.5 s. The free tier also has a per-minute quota per model (`GenerateRequestsPerMinutePerProjectPerModel-FreeTier`, HTTP 429, clears within seconds).

**Decision:**

- Default `GEMINI_MODEL` is `gemini-flash-lite-latest`. A `GEMINI_MODEL` line in `backend/.env` overrides the default, so each developer must change or blank it (an empty value uses the default).
- `GEMINI_TIMEOUT_MS` is a **per-attempt** timeout, default 10 s. A call is tried up to 3 times for a timeout, a 503 or a 429 (a 429 waits longer between attempts). Other statuses, such as 400, are not retried. The check-in question client (`feel/gemini-question.client.ts`) is stricter because a person waits on it: at most 2 attempts inside an 8 s overall deadline, then the fixed question is used. The failure is logged once, with the status or error name only.
- The app's scan request timeout is 45 s, longer than the API's worst case (about 32 s), so the API's answer arrives first.

**Consequences:** In the last paced run 8 of 8 scans succeeded, the slowest in 2.5 s; 18 of 20 back-to-back scans succeeded (the two failures were quota 429s). One Gemini key shared by several developers or testers can still hit the per-minute quota, so avoid scan bursts and consider a paid tier or a key per developer. `-latest` is an alias that Google can repoint to a newer model without notice: pin a named model before anything public. `gemini-2.5-flash-lite` returned 404 for this key.
