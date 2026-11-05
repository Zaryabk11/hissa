# Hissa Mobile UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing Hissa Expo screens visually consistent with the approved landing identity while preserving their current features, routes and data behavior.

**Architecture:** Update the shared theme and Hissa UI primitives first, then refresh existing screen families in the order of the main meal flow. Use the current components as the implementation surface; do not rebuild screens as standalone mockups. Render the actual app after each family, fix visual defects, and record results in the mobile handoff.

**Tech Stack:** Expo, React Native, TypeScript, Expo Router, existing Hissa UI components and tests.

**Spec:** [Hissa visual system](../specs/2026-11-06-hissa-visual-system-design.md). **Start here:** [mobile UI handoff](../../design/mobile/README.md).

## Global constraints

- Working screens: cream `#FFF6DD` canvas, warm cream `#FFF1C2` grouping, ink `#1A0A05` text, saffron `#F4B41A` emphasis, green `#0B6B3A` primary actions. Red `#C8102E` and pink `#E5338A` are rare brand accents, never diet warnings.
- Bricolage Grotesque 800 for major headings, Figtree for body and controls, Urdu `حصہ` as a brand mark. The app's interface labels remain English.
- Solid green primary buttons with cream text; no outline-only primary CTA. Preserve at least 44 × 44 px touch targets, WCAG AA text contrast, visible focus and reduced-motion equivalents.
- Preserve existing API calls, navigation, auth, scan correction, meal save, check-in, friend privacy and notification behavior. No new features or backend/database work.
- Label displayed numbers as estimates per `AGENTS.md`; no medical advice. Do not expose meals, photos, calories or feelings to friends.
- Keep the camera and scanning views dark when the live preview/progress needs contrast; they must still use the new brand colors and typography. The cream app theme is the default regardless of device appearance.
- Do not copy the landing WebGL or scroll animations into working screens. Use food art only where it clarifies a task.
- Do not commit, push, deploy, run paid generation or change external services without the user's request. Parallel agents need separate worktrees and non-overlapping files; shared theme work must be integrated first.

## File map

| Area | Existing files to change or inspect |
| --- | --- |
| Shared theme | `frontend/src/shared/theme/hissaTokens.ts`, `HissaThemeProvider.tsx`, `landingTokens.ts` for font names only |
| Shared UI | `frontend/src/shared/ui/hissa/{HissaRoot,HissaScreen,HissaText,PrimaryButton,Choice,Pill,ProgressDots,Bone,TabBar}.tsx` |
| Core meal flow | `frontend/src/features/today/`, `scan/`, `plan/` and matching `frontend/app/` routes |
| Return loop | `frontend/src/features/feel/`, `social/`, `frontend/app/inbox.tsx` |
| Supporting screens | `frontend/src/features/onboarding/`, `profile/`, `history/`, `recipes/`, `avoids/`, auth route and matching `frontend/app/` routes |
| Handoff evidence | `docs/design/mobile/README.md` plus concise notes/screenshots for each completed family |

## Review focus

1. Existing screens with empty or failed API data must keep a clear next action.
2. A 320 px phone must not clip headings, controls, estimates or bottom actions.
3. A 390 × 844 phone must show the primary task clearly; the raised Scan tab must not obscure content.
4. Camera overlay controls must remain legible over bright and dark photos.
5. Large text, keyboard focus and reduced motion must preserve every action and state.

---

### Task 1: Shared visual foundation

**Files:** Modify the shared theme and UI files in the file map. Inspect `frontend/src/features/scan/CameraScreen.tsx` and `ScanningScreen.tsx` for their explicit dark theme use.

**Interfaces:** Keep `useHissaTheme()` and the `HissaTheme` fields usable by all existing screens. The cream theme becomes the app default; a dark camera/scanning theme may remain as an explicit override. Later tasks consume these tokens and primitives.

- [ ] **Step 1: Inspect current uses of `graphite`, `paper`, `HissaTheme` and shared UI primitives.** List any hard-coded lime or graphite values that the shared change will not reach.
- [ ] **Step 2: Update the shared color tokens, theme default, status bar, type, screen shell, primary button, choices, pills and tab bar.** Preserve component props and accessibility roles. The Scan action remains centered and prominent.
- [ ] **Step 3: Run `npm run lint` and `npm run build`.** Resolve any type or import break introduced by the token change.
- [ ] **Step 4: Render Today and Camera as a quick integration check.** Confirm cream default and legible dark camera controls; fix shared component issues before refreshing individual screens.

### Task 2: Today and meal flow

**Files:** Modify `frontend/src/features/today/`, `scan/`, `plan/` and their existing routes only where presentation needs it.

**Interfaces:** Consumes Task 1's theme and controls. Produces a consistent path from **Scan a meal** through correction, portion recommendation and Save meal.

- [ ] **Step 1: Refresh Today.** Make portion context and Scan a meal prominent; keep meals, weekly context and recipes secondary. Preserve populated, loading and empty behavior.
- [ ] **Step 2: Refresh Camera, Scanning and No plate.** Preserve capture, gallery/manual choice, retry and progress behavior; remove old lime styling.
- [ ] **Step 3: Refresh Review.** Preserve uncertain dish questions, corrections and avoided-item behavior; make the confirm action clear.
- [ ] **Step 4: Refresh Plan.** Make roti/katori guidance and Save meal clear, label estimates and retain kind light-plan copy.
- [ ] **Step 5: Run relevant existing tests and render each changed screen at 320 × 568 and 390 × 844.** Check the five review-focus conditions and the full save flow. Record visual and functional evidence in the handoff.

### Task 3: Food & Feel and Social

**Files:** Modify `frontend/src/features/feel/`, `social/`, `frontend/app/(tabs)/feel.tsx`, `social.tsx` and `frontend/app/inbox.tsx` as needed.

**Interfaces:** Consumes Task 1's theme; preserves question options/order, friend privacy and inbox-only notifications.

- [ ] **Step 1: Refresh Food & Feel.** Make the due question and answer/skip choices readable; keep pattern and private experiment content secondary; preserve all existing states.
- [ ] **Step 2: Refresh Social and Inbox.** Clarify add friend, request, cheer, nudge and shared goal actions without exposing private meal information.
- [ ] **Step 3: Run relevant existing tests and render populated, empty, loading and error states at 320 × 568 and 390 × 844.** Record the privacy and accessibility checks in the handoff.

### Task 4: Entry and supporting screens

**Files:** Modify the existing sign-in, onboarding, profile, avoids, meal history/detail and recipes components/routes from the file map as needed.

**Interfaces:** Consumes the same shared tokens and controls; preserves all form and API behavior.

- [ ] **Step 1: Refresh sign-in and onboarding.** Keep each step's question, current values and next action clear; retain the avoid list and budget reveal behavior.
- [ ] **Step 2: Refresh Profile, avoids, history and meal detail.** Keep account actions, edit/delete distinctions and estimate labels clear.
- [ ] **Step 3: Refresh recipes list and detail.** Preserve the expected empty state until recipes are reviewed and the Not for me action.
- [ ] **Step 4: Run relevant existing tests and render each changed screen at 320 × 568 and 390 × 844.** Check long text, forms, errors and focus.

### Task 5: Cross-screen consistency review

**Files:** Update `docs/design/mobile/README.md` with changed files, verification results and any approved deviations. Modify only screens where the review finds a concrete issue.

**Interfaces:** Produces the final agent handoff and evidence that the shared visual system holds across the app.

- [ ] **Step 1: Compare screenshots side by side.** Fix inconsistent heading scale, button treatment, spacing, card density, tab navigation or old lime/graphite remnants.
- [ ] **Step 2: Run `npm test`, `npm run lint` and `npm run build`.** Report results and any existing failures separately from refresh regressions.
- [ ] **Step 3: Check the core flow and at least one empty/error state on a device when available.** State clearly which platforms were not tested.
- [ ] **Step 4: Summarize changed screens, visual choices, verification and remaining limitations in `docs/design/mobile/README.md`.** Leave landing implementation outside this task.

