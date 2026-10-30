# 0001: Modular monolith, layered inside each module

**Status:** accepted

**Context:** Two people, 10 days, one deployable on Vercel. Features (scan, nutrition, plan, streaks, feel) must stay separable so two people can work in parallel.

**Decision:** One Express app with one module per feature. Inside a module: routes -> controller -> service -> repository. Cross-module calls go through `index.ts` only. Both rules are enforced in ESLint.

**Consequences:** No network hops between features and easy mocking. Boundaries rely on lint, so CI must run `npm run lint`.
