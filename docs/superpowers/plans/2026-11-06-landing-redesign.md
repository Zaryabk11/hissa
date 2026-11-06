# Hissa Landing Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish and verify the v5 landing so it can replace `frontend/public/landing-site/` after owner sign-off.

**Architecture:** Start from the trial build (a straight port of the v5 mockup into `frontend/public/landing-site/`, single `index.html`, relative `assets/ fonts/ vendor/`, CTA via `postMessage('hissa:explore')`). Apply the approved copy and a11y fixes in place, replace runtime image keying with build-time transparent WebP, flatten CSS nesting, then verify in browsers and in the Expo wrapper. No app code changes.

**Tech Stack:** Vanilla HTML/CSS/JS, Lenis (vendored), WebGL, `sharp` (already in backend), Vitest (`npm test -w frontend`), Playwright for checks.

**Spec:** `docs/superpowers/specs/2026-11-06-landing-redesign-design.md` (section numbers below refer to it). Mockup: `/Users/sobanahmad/Work/8x hackathon/hissa-landing-handoff/final/landing-full-v5.html`.

**Starting point:** branch `worktree-agent-a9fcaf277f9407224`, worktree `.claude/worktrees/agent-a9fcaf277f9407224`, uncommitted. Task 0 below makes it a real branch. Its `landing-site/` replaces the old one inside that branch only; `main` keeps the old site until Task 7. This satisfies spec 11.1 "keep the old one until sign-off" by branch isolation instead of a `landing-site-next/` folder (decision: avoids a second path to un-rename later; the wrapper `/landing-site/index.html` is tested as it will ship).

## Decisions made here (spec 10 and 11 left them to the builder)

- **Single file, no module split.** Keep `index.html` (about 1,950 lines). The trial runs; the spec says match the mockup before tuning, and the seam-diff verification (Task 5) is the only safety net for hand-offs that share `HX` globals. A split would cost a re-verify of all eight hand-offs for no user-visible gain. Revisit only if the owner wants the page maintained by several people. Skipped from 11.1: dedupe of `blob()`/shaders/scene markup, `landing-site-next/`, static-HTML-for-JS-built-text beyond the no-JS fallback.
- **Precompute transparent WebP** (Task 3). Justified: iOS 16.0 to 16.3 lack `OffscreenCanvas`, so the main-thread keyer would run long tasks on the minimum browser; karahi is keyed two ways today; the rail waits on six sequential keyings; WebP with alpha is smaller than the JPEGs. The hero shader keys itself, so `karahi-1024.jpg` and `thali-1024.jpg` stay as JPEG.
- **CSS nesting flattened** with a one-off `lightningcss` run, output committed as the new source (Task 4). Safari 16 to 17.1 has no nesting.
- **Resize across 820 px keeps the existing reload** (mode is decided once at load, spec 5.5). Pinned-to-stacked is a different DOM state, not a re-layout. Covered by a Review Focus test.
- **Analytics hooks (spec 6.6), OG image, JSON-LD, Pause control, mobile menu: not built.** No provider or owner input exists; add when asked.
- **Focus ring:** one CSS variable `--ring` on every stage, ink by default, cream inside the green and ink stages. Replaces all `outline: ... var(--pk)` rules.

## Global Constraints

- Self-hosted only: no CDN, Google Fonts link or third-party script; asset URLs relative (`assets/...`).
- Every number labelled "estimate"; no medical, calorie-verdict or "good/bad food" wording.
- Browser floor: iOS 16 Safari and WebView, plus latest two desktop Chrome, Safari, Firefox, Edge.
- Stacked static mode at 820 px and below or `prefers-reduced-motion`; no timing changes while porting (spec 11.1).
- CTA contract: inside React Native WebView `ReactNativeWebView.postMessage('hissa:explore')`; inside an iframe `parent.postMessage('hissa:explore', location.origin)`. Every "Get Hissa" CTA posts exactly once and opens sign-in (owner answer, 2026-11-06; supersedes spec 10.3's builder note).
- Targets: about 1.6 MB total, about 0.65 MB gating the loader, loader capped at 6 s, no long task over 100 ms after hand-off.
- No Superdesign commands. No deploy, no push. Commit `.claude-logs/` with every commit (CLAUDE.md). Do not edit `CLAUDE.md` or `docs/PRD.md` (owner decision, spec 12).
- Approved copy (spec 5.6, 9): dish names `Beef karahi`, `Daal, palak, chawal, roti` / `on one plate`; maash daal chips `1 katori`, `2 roti`; FAQ is 5 questions, no photos question; cost answer `Hissa is free while it is in early access. We will tell you before that changes.`; Bilal streak 7 everywhere. Kept as the owner accepted (spec 12): `Bilal cheered your plate`, `Ayesha logged lunch`, `Cheer streaks, nudge gently.`, `Shabash! from Bilal`, `Walk after dinner`.

## Review Focus

Not exercised by the spec's own checks, most likely first:

1. **821 to 1100 px wide** (1024x768, 1180x820, tablets in landscape): scenes scale below 1 while text stays 1 and may overlap. Expect: no overlapping text, no horizontal scroll; otherwise raise the stacked breakpoint. Test in Task 5.
2. **Crossing 820 px while open** (phone rotation, window resize): page reloads. Expect: the loader finishes within 6 s and the page is usable, no blank screen or console error. Test in Task 5.
3. **WebGL unavailable or context lost** (iOS WebView under memory pressure; three contexts): expect static 2D wordmarks and a working page. Test in Task 5.
4. **JavaScript off or an asset 404:** expect readable content with JS off (spec 5.4d) and the loader reaching hand-off when one dish image fails. Tests in Tasks 2 and 3.
5. **CTA fired twice or from the wrong link:** one click posts exactly one `hissa:explore`, and only from `#get`; nav and other CTAs scroll. Test in Task 2.

---

## File Structure

- Modify: `frontend/public/landing-site/index.html` (copy, a11y, meta, flattened CSS, WebP switch, keyer removal)
- Create: `frontend/src/features/landing/landingSite.test.ts` (static guard: copy, product rules, self-hosting)
- Create: `frontend/scripts/landing-key.mjs` (keyer, ported from the page's `keyPix`), `frontend/scripts/landing-key.test.mjs`
- Create: `frontend/scripts/build-landing-assets.mjs` (originals to `assets/dishes/*.webp`)
- Create: `frontend/scripts/landing-tour.mjs` (Playwright: tour, seams, modes; not part of `npm test`)
- Create: `frontend/public/landing-site/assets/dishes/*.webp` (7 files: karahi, biryani, daal, nihari, aloogosht, haleem, palak)
- Modify: `frontend/public/landing-site/fonts/noto-nastaliq-urdu-700.woff2` (subset)
- Modify: `frontend/package.json` (devDependency `sharp`, same range as backend)
- Modify: `docs/superpowers/plans/2026-11-02-v2-status.md` (Task 7 only)
- Unchanged: `frontend/app/landing.tsx` (the trial only edited a comment)

---

### Task 0: Make the trial branch buildable

**Files:** worktree `.claude/worktrees/agent-a9fcaf277f9407224`

- [ ] **Step 1:** In the worktree run `npm ci` at the repo root (the trial had no `node_modules`). Run `npm run lint -w frontend && npm run build -w frontend && npm test -w frontend`. Expected: all pass.
- [ ] **Step 2:** Commit the trial as is (`feat(landing): port v5 mockup`), staging `.claude-logs/`. This is the baseline every later diff is read against.

### Task 1: Approved copy and a static guard test

**Files:** Modify `frontend/public/landing-site/index.html`; Create `frontend/src/features/landing/landingSite.test.ts`

**Interfaces:** Produces the test file later tasks re-run as a regression guard. It reads the HTML with `readFileSync(fileURLToPath(new URL('../../../public/landing-site/index.html', import.meta.url)), 'utf8')`.

- [ ] **Step 1: Write the failing test** `landingSite.test.ts`, with one `it` each:
  - `uses catalog dish names`: html contains `Beef karahi`, `Daal, palak, chawal, roti`, `on one plate`; not `Chicken handi`, `Home thali`; `/Maash daal[\s\S]{0,300}1 katori[\s\S]{0,60}2 roti/`.
  - `FAQ has five questions and the approved cost answer`: `html.match(/class="q"/g)` length 5; contains the cost answer string from Global Constraints; not `Do you keep my photos`, not `TODO user`; the "five things" line still says "five".
  - `Bilal streak is 7 everywhere`: no `streak 4 days`.
  - `privacy lines make no claim about what friends do not see`: no `never what you ate`, no `Never your meals`, no `Very little`.
  - `numbers are estimates`: for each `kcal` match, the 120 characters either side contain `estimate` (case-insensitive); list any intentional exception inline.
  - `no banned claims`: strip `<script>`, `<style>` and tags, then `/\b(cure|treat|diagnos\w*|healthy|unhealthy|detox|burn|good food|bad food)\b/i` has no match.
  - `self-hosted`: no `googleapis`, `gstatic`, `cdn.`, `src="/`, `href="/`, `url(/`, `'/files/`.
- [ ] **Step 2:** Run `npm test -w frontend -- landingSite`. Expected: FAIL on dish names, FAQ, Bilal and privacy tests.
- [ ] **Step 3: Apply the copy in `index.html`:**
  - Rail data (about line 1613): name `Daal, palak, chawal, roti`, sub-line `on one plate`; maash daal chips `1 katori`, `2 roti`.
  - How it works confirm chip (about line 1399): `Chicken handi` becomes `Beef karahi`.
  - Final CTA chip (about line 1048): `streak 4 days` becomes `streak 7 days`.
  - Delete the FAQ photos question (about line 1017); renumber `fq-q/fq-a` ids so `aria-controls` and `aria-labelledby` still pair; the cost answer replaces the TODO comment; the intro line says "five".
  - Neutral privacy text (single data strings, flagged for owner wording per spec 12.2): Buddy body (two places, about lines 823 and 873) becomes `Cheer streaks, nudge gently.`; FAQ 3 answer becomes `Your username, your display name, whether you logged today, your streak, nudge status, and a goal if you choose to share it. Nudges and cheers land in the app's inbox. There is no push notification.`
  - Add `<!-- owner wording pending: spec 12.2 -->` beside each of the three.
- [ ] **Step 4:** Run `npm test -w frontend -- landingSite`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(landing): approved v5 copy and static guard`.

### Task 2: CTA wiring, head, accessibility

**Files:** Modify `frontend/public/landing-site/index.html`; Test `frontend/src/features/landing/landingSite.test.ts`, `frontend/scripts/landing-tour.mjs` (created here, extended in Task 5)

**Interfaces:** `landing-tour.mjs` exports `async function open(browser, {w, h, rm, js, embed})` returning a Playwright page after hand-off (waits for `html:not(.ld)`), failing the run on `pageerror`. `embed` loads the page inside an iframe host that records `message` events into `window.__msgs`.

- [ ] **Step 1: Failing tests.** Static: `<title>` is `Hissa · One more roti is fine`; `<meta name="description">` text from spec 6.5; `theme-color` `#F4B41A`; favicon is not `data:,`; a skip link `href="#main"` exists; `<noscript>` contains a rule making `main` sections visible and hiding the loader; no `outline:` rule uses `var(--pk)`; the Buddy copy and idea-card duplicates inside `#hw` and `#bd` carry `aria-hidden="true"` and `inert`. Browser (`landing-tour.mjs`, run by hand): in an iframe host, click nav CTA, hero CTA and `#get` separately; each click posts exactly one `hissa:explore`, while section nav and Privacy/Terms post none; with JS disabled `open(...{js:false})` body text includes `One more roti is fine.` and `Fair questions`.
- [ ] **Step 2:** Run `npm test -w frontend -- landingSite` (FAIL) and the browser check (FAIL: nav click posts).
- [ ] **Step 3: Implement in `index.html`:**
  - Click handler (about line 1885): every `a[href="#get"]` posts to the host once; standalone may call `goGet()`. No other link posts.
  - Head: title, description, theme-color, saffron SVG data-free favicon file `assets/favicon.svg`, `<noscript><style>` per spec 5.4d and 6.5.
  - Focus: define `--ring` (ink) on `:root`, `--ring: var(--cr)` inside `#bd`, the idea layer, `#dr`, and the nav when `body.ri-p`; every `:focus-visible` rule uses `outline:3px solid var(--ring);outline-offset:3px`. Replaces lines 130, 146, 147, 631, 632, 640, 690 style rules.
  - Skip link first in `body`, targets `main` (add `id="main"`); `min-height:44px` on `.nav .cta` and footer links.
  - Duplicates: `aria-hidden="true" inert` on `#hw-bcopy`, `#hw-bs` and the idea cards inside `#bd`.
  - Nav highlight: no link current until Buddy is reached (spec 10.12); keep the rest.
  - WCAG 2.2.2: hero feed chips `animation-iteration-count:2`; footer marquee pauses on `:hover`/`:focus-within`.
  - Logo becomes `<a href="#top" aria-label="Hissa, back to top">`.
- [ ] **Step 4:** Re-run both checks. Expected: PASS. Also run axe-core on the loaded page once (zero serious/critical).
- [ ] **Step 5:** Commit `feat(landing): CTA contract, meta, focus and a11y fixes`.

### Task 3: Precomputed transparent dish paintings

**Files:** Create `frontend/scripts/landing-key.mjs`, `frontend/scripts/landing-key.test.mjs`, `frontend/scripts/build-landing-assets.mjs`, `assets/dishes/*.webp`; Modify `index.html`, `frontend/package.json`

**Interfaces:**
- Produces `keyPix(a: Uint8ClampedArray, W: number, H: number, P: KeyParams): { x0:number; y0:number; x1:number; y1:number }` in `landing-key.mjs`: same body and parameter object (T0, T1, H0, PK, seeds, cut ellipse, shadow grow, clean) as the page's `keyPix` (about line 1098), plus the per-dish table in spec 6.2.
- Produces `node frontend/scripts/build-landing-assets.mjs <originalsDir>` which writes `assets/dishes/<dish>.webp` (1024 px wide, alpha, quality 82, trimmed to the keyed box and fitted to the common width per the page's `TW`/fit values) and prints a size report.
- Produces page helper `HX.img(name: string): string` returning `assets/dishes/<name>.webp`, replacing `HX.key`, `HX.karahi`, `keyLib`, the Worker blob and `?nokeyworker`.

- [ ] **Step 1: Failing test** `landing-key.test.mjs`: build a 64x64 RGBA buffer of flat `#F5D77A`, a 24x24 red square in the middle with a 6x6 background-coloured hole inside it, and a 1-px background border. Assert after `keyPix` with `{T0:14,T1:30,H0:11,PK:0}`: corner alpha is 0, centre of the square alpha is 255, the enclosed hole (seeded in `P`) keeps alpha 0, and square colour is not yellow-tinted at its edge (R greater than G+60 at a boundary pixel with alpha above 0).
- [ ] **Step 2:** Run `npm test -w frontend -- landing-key`. Expected: FAIL (module missing).
- [ ] **Step 3:** Implement `landing-key.mjs` (copy the pure function, drop DOM/worker code). Test passes.
- [ ] **Step 4:** Add `sharp` to `frontend/package.json` devDependencies (`^0.35.5`, as backend). Implement `build-landing-assets.mjs` for the seven dishes using the spec 6.2 table (karahi with seed points; nihari cut ellipse; aloo gosht and palak special cases). Run it against `/Users/sobanahmad/Work/8x hackathon/hissa-landing-handoff/final/originals`. Expected: seven WebP files, total size at most the seven JPEGs' size (about 1.04 MB).
- [ ] **Step 5: Halo review.** Build a contact sheet (scratchpad HTML) showing each WebP at 2x on saffron `#F4B41A`, cream `#FFF6DD`, green `#0B6B3A`, ink `#1a0a05`; screenshot and look at each. Fix parameters for any pale rim or hard-cut steam (nihari, palak, aloo gosht are the known risks). Check the hero still looks the same (its shader and `karahi-1024.jpg` are untouched).
- [ ] **Step 6:** Switch the page: How it works plate, Features flying plate, final CTA table use `HX.img('karahi')`; the rail uses `HX.img(k)`; delete the keyer code and the `HX.key.worker` check (about line 1702); the rail warm-up becomes a plain lazy `<img loading="lazy">` set when within three screens. Static test: html has no `OffscreenCanvas`, `nokeyworker`, `keyLib`. Remove the unused `*-1024.jpg` of the six rail dishes from `assets/` (karahi and thali JPEGs stay).
- [ ] **Step 7:** One failing image must not hold the page: in the browser check, route-block `assets/dishes/haleem.webp` (404); the loader still hands off and the rail still renders. Run `npm test -w frontend`. Expected: PASS.
- [ ] **Step 8:** Commit `feat(landing): build-time transparent dish paintings`.

### Task 4: Browser-floor CSS and font weight

**Files:** Modify `index.html`, `fonts/noto-nastaliq-urdu-700.woff2`

- [ ] **Step 1: Failing test** in `landingSite.test.ts`: `no CSS nesting`: inside `<style>` text, no line matches `/^\s*&/` and no selector rule is opened inside another rule (a brace-depth scan: depth never exceeds 1 outside `@media`/`@keyframes`/`@font-face`/`@supports`). Expected FAIL.
- [ ] **Step 2:** Flatten: from a scratch directory (not the repo) extract each `<style>` block to a file, run `npx -y lightningcss-cli --targets "ios_saf >= 16, chrome >= 120, firefox >= 120, safari >= 16" --nesting`, and paste the flattened result back. Skip minify. Diff the rendered screenshots at 5 scroll positions before and after (Task 5 script); expect zero changed pixels.
- [ ] **Step 3:** Subset Noto Nastaliq: `pyftsubset noto-nastaliq-urdu-700.woff2 --text="حصہ" --layout-features='*' --flavor=woff2`. Compare the wordmark canvas at hero, loader and footer sizes against the unsubset render; keep the original if any joining differs. Expect over 100 KB saved.
- [ ] **Step 4:** Run `npm test -w frontend`. Expected: PASS. Commit `perf(landing): flatten nesting, subset wordmark font`.

### Task 5: Verification tour and fixes

**Files:** Modify `frontend/scripts/landing-tour.mjs`; fixes land in `index.html`

**Interfaces:** Consumes `open(...)` from Task 2. Produces `node frontend/scripts/landing-tour.mjs <outDir> [--only seams|tour|modes]`; prints a PASS/FAIL table.

- [ ] **Step 1: Tour.** Implement the checkpoints from spec 11.3.1 at 1920x1080, 1440x900, 1280x720 and 390x844 (stacked, 700 px steps). Scroll with `HX.lenis.scrollTo(y,{immediate:true})` and wait one frame. Assert exactly one stage has `visibility: visible` at each checkpoint. Save PNGs under `<outDir>` (kept out of git; attach to the PR).
- [ ] **Step 2: Seams.** For the six hand-offs in spec 11.3.2 capture just before and after the visibility switch and diff with `pixelmatch`; assert under 0.5% changed pixels excluding the animated regions. Any failure is fixed in `index.html` (this task owns the tuning; spec 10.7 values are first guesses).
- [ ] **Step 3: Modes.** Add: reduced motion (`emulateMedia`): stacked, no Lenis, `scrollWidth === clientWidth`; 390: no horizontal scroll, buttons at least 44 px, body at least 16 px, FAQ opens by keyboard, rail has snap; copy-audit already in Task 1.
- [ ] **Step 4: Review Focus tests.** 1024x768 and 1180x820: no `scrollWidth` overflow and no overlapping text boxes among Buddy/How it works scene text (bounding-box intersection on headings and CTAs); 1000 to 700 resize: after reload the loader reaches hand-off within 6 s, no console error; WebGL off (launch args `--disable-gpu --disable-webgl` plus a `getContext` override): wordmark canvases non-empty (alpha pixels found) and no `pageerror`.
- [ ] **Step 5: Throttle.** CDP Slow 4G and 4x CPU: loader reaches 100% by 6 s, failsafe (10.5 s) not hit, no layout shift after hand-off (PerformanceObserver `layout-shift` sum under 0.02), no console errors. Record gate transfer (target at most 0.65 MB) and total (target at most 1.6 MB).
- [ ] **Step 6: Matrix.** Run Playwright `chromium`, `firefox`, `webkit` (latest). For iOS 16, boot an iOS 16 simulator if installed (`xcrun simctl list runtimes`), open the dev server URL in Safari and tour by hand; if no runtime exists, log "iOS 16 unverified" in the PR for the owner.
- [ ] **Step 7:** Run tour on a real phone and laptop for frame rate (60 fps is unconfirmed headless). Run Lighthouse as a smoke check. Fix findings; re-run until green. Commit `test(landing): scroll tour, seam and mode checks` plus `fix(landing): ...` per fix.

### Task 6: Expo wrapper and native WebView

**Files:** none expected (`frontend/app/landing.tsx` unchanged)

- [ ] **Step 1:** In the worktree with `node_modules`, run `npm run dev:app`. Open `/landing` on web: the iframe loads `/landing-site/index.html`; scroll, wheel, focus and `innerHeight` behave as top-level; click `#get`: router goes to `/(auth)/sign-in`. Expected: pass.
- [ ] **Step 2:** Native: start Expo and open in Expo Go on an iOS simulator (and Android if available); with `EXPO_PUBLIC_LANDING_URL` unset the dev host is used. Check scroll, loader hand-off, `#get` navigates to sign-in, Privacy/Terms placeholders do not navigate. If no simulator is available, record "native unverified" for the owner.
- [ ] **Step 3:** Run `npm run lint`, `npm run build`, `npm test` at repo root. Expected: all pass. Note the dark `landingColors.bg` flash in the PR (spec 10.13); do not change app code.

### Task 7: Sign-off, swap and cleanup

**Files:** Modify `docs/superpowers/plans/2026-11-02-v2-status.md`

- [ ] **Step 1:** Post for owner review: tour PNGs, seam report, size report, the three unbuilt promises (spec 12) and the pending wording (Task 1), open questions (delete `scrollcraft/builds/hissa/`? iOS 16 result?). Stop until sign-off.
- [ ] **Step 2:** After sign-off only: merge the branch to `main` in one change (the branch already replaces `landing-site/` and removes the old `.webp` assets and `scrollcraft.*`). Delete `scrollcraft/builds/hissa/` only if the owner says so. Add one line to the status doc: landing v5 live path, how to rebuild assets (`node frontend/scripts/build-landing-assets.mjs <originals>`), launch blockers from spec 12.
- [ ] **Step 3:** Run `npm run lint && npm run build && npm test`. Commit with `.claude-logs/` staged. No push, no deploy unless the owner asks.

---

## Self-review (run)

- **Spec coverage:** copy 9.5/9.6/9.4 and FAQ/cost (T1); privacy lines 12.2 (T1); CTA contract 10.3, focus 5.1, 6.4 fixes, nav highlight 10.12, noscript/meta 6.5 (T2); 6.2 keying (T3); nesting, browser floor, font subset 10.10/6.3 (T4); 11.3 checks 1 to 9 (T1, T2, T5, T6); rollout 11.4 (T0, T7). Not planned, stated above: module split, dedupe, analytics, OG, JSON-LD, pause control, mobile menu, mobile hero polish (spec 7 says only after desktop verified).
- **Step scan:** each step names its file and expected result; no code bodies beyond test assertions.
- **Types:** `keyPix`, `HX.img`, `open(...)` named the same in every task.
- **Proportion:** about a quarter of the spec's length.
