# 0002: Gemini names dishes, tables supply the numbers

**Status:** accepted

**Context:** An LLM guessing calories is unverifiable and can drift. The PRD also requires every number to be labelled an estimate.

**Decision:** Gemini answers from our dish catalog only (structured output enum plus "unknown") and returns a portion guess and confidence. Calories come from FatSecret per serving, falling back to our local desi table.

**Consequences:** Dishes outside the catalog resolve to "unknown" and ask the user. FatSecret Basic forbids long-term caching, so apply for Premier Free on day 1.
