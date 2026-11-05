# Hissa mobile UI refresh: start here

Status: **approved direction for enhancing existing Expo screens** (2026-11-06).

This folder is the entry point for an agent or teammate **updating the already-built authenticated mobile screens**. The user approved the shared visual direction: **mostly cream app screens with saffron and green highlights**. Apply it to the current Expo UI, beginning with shared theme and controls, then Today and the core scan flow. Preserve the screens' routes, data and behavior. Review real renders of the changed app; standalone mockups and prior screen-by-screen approval are not required.

## Read in this order

1. [`AGENTS.md`](../../../AGENTS.md) and the [current status](../../superpowers/plans/2026-11-02-v2-status.md). Trust current code when old status prose disagrees.
2. The [approved visual system](../../superpowers/specs/2026-11-06-hissa-visual-system-design.md). This is the source for app color, type, hierarchy, CTA, copy, motion and accessibility.
3. The [mobile UI refresh plan](../../superpowers/plans/2026-11-06-hissa-mobile-ui-refresh.md). It names the implementation order, files and review checks.
4. The [archived landing handoff](../reference/landing-v2/SOURCE_HANDOFF.md), [combined locked mockup](../reference/landing-v2/hero-to-idea-v5.html), [Idea detail](../reference/landing-v2/idea-section-v2.html), [wordmark detail](../reference/landing-v2/wordmark-cubes-v5.html) and [painted assets](../reference/landing-v2/assets/). These show the brand's character. Their old landing-only process instructions do not govern this mobile work.
5. Read the target screen's current `frontend/src/features/` component and its `frontend/app/` route before editing. Current behavior and API data are constraints; simplify the presentation where it helps the user.

`docs/design/HANDOFF.md`, `docs/design/Hissa Screens.html` and the graphite/lime theme tokens document the older shipped look. They are useful for finding existing behavior, but they do not override the approved cream/saffron/green direction.

## Current work order

| Screen family | Refresh status | Product files to inspect |
| --- | --- | --- |
| Shared theme and controls | Needs refresh — **start here** | `frontend/src/shared/theme/hissaTokens.ts`, `HissaThemeProvider.tsx`, `frontend/src/shared/ui/hissa/` |
| Today | Needs refresh | `frontend/src/features/today/TodayScreen.tsx`, `components/`, `frontend/app/(tabs)/today.tsx` |
| Camera → Scanning → No plate → Review → Plan | Needs refresh | `frontend/src/features/scan/`, `frontend/src/features/plan/`, `frontend/app/(scan)/` |
| Food & Feel | Needs refresh | `frontend/src/features/feel/`, `frontend/app/(tabs)/feel.tsx` |
| Social → Inbox | Needs refresh | `frontend/src/features/social/`, `frontend/app/(tabs)/social.tsx`, `frontend/app/inbox.tsx` |
| Sign-in → Onboarding | Needs refresh | `frontend/app/(auth)/`, `frontend/src/features/onboarding/`, `frontend/app/(onboarding)/` |
| Profile, meal history, recipes | Needs refresh | `frontend/src/features/profile/`, `history/`, `recipes/` and matching routes |

The landing hero and The idea are locked references. Buddy through footer remain open landing work and are outside the mobile-first sequence.

## How to refresh one screen family

1. Inspect the existing route, component, shared primitives and its populated, loading, empty and error states. Note the user's main task and the one primary action. Keep the current API behavior.
2. Update the shared theme or component when the same visual rule applies across screens. Use cream/ink as the working canvas, saffron for emphasis and solid green for the main action. Do not paste the landing hero or WebGL effects into task screens.
3. Update the screen in Expo. Improve hierarchy, spacing, typography, controls and copy where needed; keep the existing feature set. Use the screen briefs in the spec as priorities, not a demand to rebuild the flow.
4. Render the **actual updated app** at **320 × 568** and **390 × 844**. Inspect clipping, safe areas, raised Scan button clearance, long text, 44 px touch targets, WCAG AA contrast, visible focus and reduced motion. Check the same states and interactions that worked before.
5. Record changed files, before/after screenshots or render links, test commands and remaining issues in a concise Markdown note. Continue to the next family after the current one is verified; ask the user only for a material design decision the approved system does not settle.

Keep the shared system consistent while allowing each screen to have its own hierarchy. If a screen needs a major new composition that cannot be judged in the app, a temporary mockup is useful, but it is not a required gate.

## Ready-to-paste partner prompt

> Enhance the **existing Hissa mobile UI** so it is visually consistent with the approved landing identity. First read `AGENTS.md`, `docs/superpowers/plans/2026-11-02-v2-status.md`, `docs/design/mobile/README.md`, the approved visual system and UI refresh plan linked above, then inspect the current Expo screens. Start with shared theme and UI primitives, then Today and the scan flow. Use mostly cream surfaces, ink hierarchy, saffron highlights, solid green primary actions, Bricolage/Figtree type and restrained food-led imagery. Preserve routes, API calls, screen states and product/privacy rules. Update the actual Expo components, render them at 320 × 568 and 390 × 844, check accessibility and interactions, and record what changed and what was verified. Work through the remaining screen families in the plan. Do not add features or edit the landing page. Do not commit, push or deploy unless I ask.

If work is split between agents, give each agent a separate worktree and a non-overlapping screen family. Integrate shared theme work before parallel screen updates so they all use the same tokens.
