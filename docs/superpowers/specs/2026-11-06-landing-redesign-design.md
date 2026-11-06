# Hissa landing redesign: design document

Status: **draft for product-owner approval. Not committed, not pushed, not deployed.** Written 2026-11-06.
Audience: a front-end builder who will plan and build this without going back to the product owner.

## How to read this document

- The approved mockup is the source of truth for **look, copy and motion**: `/Users/sobanahmad/Work/8x hackathon/hissa-landing-handoff/final/landing-full-v5.html` (one file, 1,953 lines, 167 KB). Open it in a browser first. Where this document and the mockup disagree on a look, a copy string or a timing, the mockup wins, except in section 9, which records places the mockup conflicts with the repo's product rules and how the owner resolved each (copy approved, or kept and logged in section 12).
- This document adds what the mockup cannot say: why, limits, rules, ranges in plain numbers, states for mobile and reduced motion, what to fix, and how to build and verify it.
- Everything I (the document author) decided on my own is marked **Builder note / my call**. Everything else was decided by the product owner during the design session and is recorded as decided (**Decision: owner** where a later owner answer is folded in). The five section 9 copy items are all decided by the owner (items 1 to 3 keep the mockup wording as an accepted risk, section 12; items 4 and 5 approved).
- I described the mockup by reading its source. I did not render it in this pass. Contrast ratios not found in the repo were computed from the hex values (marked "computed").
- Related repo documents: `CLAUDE.md` (product and architecture rules), `docs/PRD.md`, `docs/superpowers/specs/2026-11-06-hissa-visual-system-design.md` (app-wide visual system, consistent with this), `docs/superpowers/specs/2026-11-04-friends-social-design.md` (what friends can see), `frontend/app/landing.tsx` (how the landing is mounted), `frontend/src/features/landing/content.ts` (old copy; mostly replaced). The archived session handoff is at `docs/design/reference/landing-v2/SOURCE_HANDOFF.md` and at `/Users/sobanahmad/Work/8x hackathon/hissa-landing-handoff/HANDOFF_PROMPT.md` (the two copies differ; the second is the full original).

---

## 1. Intent and why

Hissa is a portion coach for desi households: snap a plate, get a portion in roti and katori, keep a streak with friends. See `docs/PRD.md`. The target user is 18 to 35, eats home-cooked desi food, often with family, and is easily put off by diet-app tone.

The landing page has one job: **get a first-time visitor to tap "Get Hissa"**. Everything else (the story, the animation, the paintings) exists to make that tap feel obvious and low-risk. A beautiful page that fails to convert is a failed page.

The page is a single continuous scroll story told in eight stages, in this order: Hero, The idea, Buddy, How it works, Features, Dish rail, FAQ, Final CTA (then footer). Each stage is a full-screen colour field that hands off to the next by growing a circle ("iris") from a meaningful point (the roti chip, the table, the plate, the thali, the FAQ link, the CTA button). The page should feel hand-made, a little imperfect and warm, with culture carried by **painted food and people**, not by patterns.

### Master design principles (the owner's, applied always)

1. **Visual hierarchy.** Biggest means most important. Not an F-pattern. Section headlines are huge; supporting copy is clearly smaller; stickers and chips are the smallest tier.
2. **Solid, high-contrast CTAs. Never ghost buttons.** One primary action ("Get Hissa") on every stage, always a filled shape with a 2 px ink border and an ink drop, flipping colour per stage so it never disappears (section 5.3).
3. **Palette 60-30-10 with WCAG checks.** Applied per stage (one field colour dominates the stage, ink does the type and outlines, a little accent). Contrast pairs are listed in section 5.1.
4. **Clear type scale.** One display face for headlines, one text face for body, one script face for the wordmark only (section 5.2).
5. **Scannability and motivation.** Short lines, one idea per stage, the privacy promise stated early (Buddy), the "estimate" label on every number.
6. **Reduce friction.** A CTA is always visible in the nav; every stage has its own CTA; a stacked, no-scroll-jacking version exists for mobile and reduced motion.
7. **Design for the real audience.** Pakistani households: roti, katori, karahi, biryani, nihari; Urdu حصہ as the primary brand name; kind tone on a heavy day.
8. **Treat design as hypotheses.** The scroll-driven storytelling, the loader length, the painted dishes and the Buddy moment are bets. Section 6.6 lists what to measure so they can be judged and changed.

---

## 2. Goals, non-goals, anti-goals

### Goals

- Replace the live landing in `frontend/public/landing-site/` with the redesign, matching the approved mockup in look, copy and motion. The swap is in scope **only after owner sign-off** (Builder note / my call); until then build in `landing-site-next/` (11.1).
- Convert: a "Get Hissa" action reachable at all times (nav pill CTA) and at the end of each stage.
- Explain the product in one pass: the idea, Buddy (community), How it works (snap, confirm, eat), Features (calm budget, week view, kind on a heavy day), the dishes it knows, honest FAQ.
- Work on desktop pinned-scroll mode, and on mobile (390 px wide) and for `prefers-reduced-motion` users in a stacked, static mode with the same content.
- Stay light: about 1.6 MB total, with the first screen gated by about 0.64 MB (section 6.3).

### Non-goals

- No change to the app (Expo screens, backend, database). The landing is a static site served by the app.
- No work on the React Native `LandingPage.tsx` (the old native landing). It is only a fallback in `frontend/app/landing.tsx` for a native build with no landing URL.
- No new product features, no pricing page, no sign-up form, no waitlist backend, no store badges (the store/waitlist URL does not exist yet; `GET_HISSA_URL` in `frontend/src/features/landing/content.ts` is an empty placeholder).
- No custom Urdu calligraphy drawing in this task (Noto Nastaliq Urdu 700 is the agreed stand-in).
- No new AI image generation. The painted assets are done (section 8).

### Anti-goals (must not happen)

- **No decorative cultural ornament**: no chains, jaali, scallop borders, paisley or pattern fills. The owner rejected these as "trying too hard" and appropriation. Culture comes from food and people. (Note: rounded "wobbly" shapes, hand-drawn lines and torn edges in the mockup are hand-made texture, not cultural motifs. The loader's torn curtain edge and the FAQ sheet's arc top are the strongest edges; keep them subtle.)
- No React Native `LandingPage` work and no app code changes (one possible exception is flagged in section 10: the wrapper's dark background colour).
- **No calorie verdicts, no medical or health claims, no red warnings, no "good/bad food" language.** Every number is labelled an estimate. Never medical advice.
- **Friends never see meals, photos, calories or feelings** (the rule in `CLAUDE.md` today). The owner knowingly overrode this for the mockup's cheer, snap and goal wording; see section 12. Do not add further implications beyond those three items.
- No generic SaaS look: no feature-card grids, stock photos, robot mascot, ghost buttons.

---

## 3. Constraints

### Stack and hosting (fixed)

- Vanilla HTML, CSS and JS in `frontend/public/landing-site/` (the "scrollcraft" site). No framework. Served as static files by the Expo web build.
- Web: `frontend/app/landing.tsx` renders `<iframe src="/landing-site/index.html">` at `100dvh`. Native: a `WebView` loads `EXPO_PUBLIC_LANDING_URL` or the dev server's `/landing-site/index.html`. Per `docs/superpowers/plans/2026-11-02-v2-status.md`, signed-out app users now go to sign-in and the landing is web only, but keep native working.
- **The page lives in an iframe or WebView.** `innerWidth`, `innerHeight` and `scrollY` are the iframe's. Do not rely on the top window, on the URL hash of the parent, or on `position: fixed` relative to the real browser window. Lenis smooth scroll runs inside the iframe.
- **CTA contract with the app (existing, keep):** a click on a CTA must tell the host to open sign-in: inside React Native WebView `window.ReactNativeWebView.postMessage('hissa:explore')`; inside an iframe `parent.postMessage('hissa:explore', location.origin)`. The host then does `router.replace('/(auth)/sign-in')`. The current page does this for any element with `data-explore` (see `frontend/public/landing-site/index.html` lines 333 to 335). The mockup does not implement it (its "Get Hissa" links scroll to `#get`, and `#get` links to itself). See section 10.
- Anything outside the landing origin is blocked by the native WebView (`onShouldStartLoadWithRequest`). External links (privacy, terms, store) would be blocked on native unless handled. Another reason not to add external links without an owner decision.

### Assets and network

- **Self-hosted only. No CDN, no Google Fonts link, no third-party scripts.** The current live page loads Bricolage Grotesque and Figtree from Google Fonts; the new one must not.
- All asset URLs must be **relative** (`assets/...`), not root-absolute. The mockup uses `/files/...` because of its preview server. The page is served at `/landing-site/` on web and from a configurable origin on native.
- Licences (builder to confirm before shipping): Bricolage Grotesque, Figtree and Noto Nastaliq Urdu are open-licence Google Fonts (SIL OFL); Lenis is MIT. The paintings were generated with Seedream 5 Lite via Superdesign; confirm the commercial-use terms of that service before launch (I did not check them).

### Product rules that apply to landing copy and visuals (from `CLAUDE.md` and the PRD)

- Every number shown is labelled an estimate (a visible "estimate" pill or "about ... , estimate" text, and an accessible name that says so).
- Never medical advice. Gemini only names dishes from the catalog; numbers come from the catalog (78 dishes). Landing copy must not say the AI computes calories.
- A friend sees only: username, display name, "logged today", the streak, nudge state, and a goal the user chose to share. Never meals, photos, calories or feelings.
- Notifications are inbox-only. There is no push. (FAQ already says so.)
- Clients never write meal or friend data directly. Not relevant to a static landing, but do not add forms that post anywhere.
- English UI for v1; the Urdu wordmark حصہ is the only Urdu display text.

---

## 4. The mockup, and how to find things in it

Final deliverables are in `/Users/sobanahmad/Work/8x hackathon/hissa-landing-handoff/final/`:

| Item | File |
| --- | --- |
| Mockup | `landing-full-v5.html` |
| Smooth scroll | `lenis.min.js` |
| Fonts | `bricolage-grotesque-800.woff2`, `figtree-var-latin.woff2`, `noto-nastaliq-urdu-700.woff2` |
| Paintings (1024 px, used by the mockup) | `karahi-1024.jpg`, `thali-1024.jpg`, `biryani-1024.jpg`, `daal-1024.jpg`, `nihari-1024.jpg`, `aloogosht-1024.jpg`, `haleem-1024.jpg`, `palak-1024.jpg` |
| Full-size sources (1920 px) | `originals/*.jpg` (8 files) |

Note on `originals/`: the folder `/private/tmp/claude-501/dl/` held only 1024 px copies (byte-identical to the `-1024.jpg` files), not the 2K sources. I recovered the real 1920 px outputs of the six newer paintings from the generation records and copied them in, and added the 1920 px `karahi.jpg` and `thali.jpg` from the handoff `assets/` folder. All eight are in `final/originals/`, matching to their dish by prompt order (checked by thumbnail comparison).

Where things are in the mockup source (line numbers in `landing-full-v5.html`):

| Lines | What |
| --- | --- |
| 11 to 59, 60 to 115 | Loader CSS, markup, controller |
| 116 to 155 | Fonts, tokens, shared CTA, nav pill |
| 157 to 205 | Hero and The idea (`#hs`) CSS |
| 207 to 298 | Buddy (`#bd`) CSS |
| 300 to 434 | How it works (`#hw`) CSS |
| 436 to 551 | Features (`#fx`) CSS |
| 552 to 645 | Dish rail and FAQ (`#dr`) CSS |
| 646 to 715 | Final CTA (`#fc`) and footer CSS |
| 718 to 777 | Shared SVG symbols (avatars, icons, goo filter) |
| 779 to 1065 | Markup |
| 1069 to 1182 | Shared helpers, thali slicer, painting keyer |
| 1184 to 1308 | Hero and Idea JS (including the two WebGL effects) |
| 1310 to 1367 | Buddy JS |
| 1369 to 1499 | How it works JS |
| 1501 to 1598 | Features JS |
| 1601 to 1703 | Dish rail and FAQ JS |
| 1706 to 1837 | Final CTA and footer JS (footer wordmark WebGL) |
| 1840 to 1950 | Lenis, nav, scroll handoffs, scheduler ("master") |

Mockup quirks to fix when porting (see section 11): placeholder `<title>` ("Hissa Landing Full v5"), blank favicon (`data:,`), `/files/` absolute URLs, `HX` and `LD` globals, a `location.reload()` when the viewport crosses 820 px, `?nokeyworker` debug switch, repeated helper code (`blob()` four times, the wordmark shader twice, Buddy and How it works scene markup twice), and class names reused with different meanings across sections (`.chip`, `.card`, `.c1` to `.c3`, `.fp`, `.tag`, `.pop`, `.fade`; they are scoped by section id selectors, so they work, but the port should namespace them).

---

## 5. Decisions as decided

### 5.1 Palette, stages, contrast

Tokens (`:root` in the mockup):

| Token | Hex | Role |
| --- | --- | --- |
| saffron `--saf` | `#F4B41A` | Page field (hero, How it works, final CTA, footer); accent on dark |
| ink `--ink` | `#1a0a05` | Text, outlines, drop shadows, nav pill, dish-rail field |
| green `--grn` | `#0B6B3A` | Primary CTA; The idea and Buddy field |
| red `--red` | `#C8102E` | Wordmark layer, flame icon, nav blob end; never a warning |
| cream `--cr` | `#FFF6DD` | Features and FAQ field, cards and chips, text on green and ink |
| warm cream | `#FFF1C2` | Roti icon fill |
| paper `--paper` | `#FFFBEF` | Bubbles, plates, input-like surfaces on cream |
| pink `--pk` | `#E5338A` | Estimate pills, cheer bubbles, nudge dots, accents; background only, not text |
| light pink `--pkl` | `#FFC2DE` | Nudge pills, message bubble, sticker fill |
| muted `--mut` | `#5a4630` | Secondary text |
| deep green | `#07502B` | Buddy and How it works table fill |
| avatar violet | `#7A5CFF` | Hero feed chip "Zara" avatar only |

Stage order and colours (desktop pinned mode):

| # | Stage | Field | Notes |
| --- | --- | --- | --- |
| 1 | Hero | saffron | ink type, green CTA |
| 2 | The idea | green | opens as a circle from the pinned roti chip |
| 3 | Buddy | green | table fill deep green; table line saffron; avatars pink, saffron, cream |
| 4 | How it works | saffron | iris opens from the table centre over the Buddy end frame |
| 5 | Features | cream | iris opens from where the logged plate sits |
| 6 | Dish rail | ink | ink iris opens from the steel thali; text cream; saffron accent |
| 7 | FAQ | cream | cream iris opens from the FAQ nav link; paper bubbles |
| 8 | Final CTA | cream, then saffron | saffron iris grows from the CTA button |
| 9 | Footer | saffron | ink marquee band, giant wordmark |

60-30-10, **Builder note / my call:** I read it per stage, not across the whole page. Over the whole scroll the page is roughly a third saffron, a quarter green, a third cream and a sixth ink by scroll length (my estimate), which is deliberate: each stage is a colour moment. Inside a stage the split is about 60% field, 30% ink (type and outlines), 10% accent. This matches `2026-11-06-hissa-visual-system-design.md`, which calls 60/30/10 "a composition starting point, not a quota".

**Contrast pairs (WCAG AA: 4.5:1 normal text, 3:1 large text and essential UI graphics).**
Already measured in `2026-11-06-hissa-visual-system-design.md`: ink on saffron **10.45**, ink on cream **17.88**, cream on green **6.13**, cream on red **5.46**, green on saffron **3.58** (not for body text), pink on cream **3.77** (not for text).
Computed by me from the hex values in this pass: white on ink 19.27; saffron on ink 10.45; muted `#5a4630` on cream 8.28, on paper 8.62, on saffron 4.84, on light pink 5.96; ink on pink 4.75; ink on light pink 12.87; ink on paper 18.63; white on green 6.61; cream on deep green 8.89; green on paper 6.39; ink on green 2.92 (never use); red on saffron 3.19 (graphic only); **pink on saffron 2.20 and pink on green 1.63 (fail)**.

Where each pair is used and passes: body and headings are ink on saffron/cream/paper, cream on green/ink, all above 4.5. The nav link text is cream on ink (17.88), white when hovered (19.27). The pink "estimate" and cheer pills use ink text on pink (4.75). The green CTA on a saffron or cream stage has cream text on green (6.13) and a 2 px ink border, so the button shape is also defined by the ink border, not only by 3.58 green-on-saffron. The CTA on a green stage flips to saffron with ink text (10.45).

**Defect to fix, Builder note / my call:** the mockup sets one global focus style, `a:focus-visible{outline:3px solid var(--pk)}`. Pink against saffron is 2.20 and against green 1.63, which fails the 3:1 rule for focus indicators. Replace the global pink ring so it passes 3:1 against **every** stage colour: an ink ring with a cream offset (so it also reads on ink and green), or a per-stage ring colour (ink on saffron and cream, cream on green and ink; the mockup already uses saffron on the ink pill and ink in the final CTA and footer). Re-check every state in the final render, including disabled states and text over images.

### 5.2 Type system

- **Wordmark: حصہ** (Urdu is the primary brand name). Font **Noto Nastaliq Urdu 700** as a stand-in for custom calligraphy. Drawn as **four stacked offset layers**, back to front: red `#C8102E` offset +22, +22 (stroke 32); green `#0B6B3A` +14, +14 (stroke 32); black `#1a0a05` +7, +7 (stroke 28); white `#fff` 0, 0 (stroke 3). Each layer is stroked and filled in the same colour with round joins, so the lettering gets chunky. In the 1200 x 520 hero canvas it is drawn at `700 400px`, centred at x = W/2 - 30, baseline y = 0.74 H. Used large in: loader, hero (canvas), footer (canvas, 1600 wide, scaled to fit width). Used small in the nav (26 px, white, with a 2 px ink and 4 px red text-shadow stack as a cheap version of the layering).
- **Headings: Bricolage Grotesque 800**, tight tracking (about -0.03 to -0.045 em), line height 0.93 to 1.0. Self-hosted file declares weight 800 only; every use is 800.
- **Body and UI: Figtree** (variable, 500 to 700 in the self-hosted file), 15 to 20 px for body, 11 to 14 px for small labels.
- Scale used in the mockup (desktop): hero H1 `min(4.1vw, 50px)`; The idea / Buddy small headline `clamp(34px, 4.6vw, 56px)`; section H2s `clamp(44px, 5.3vw, 78px)`; How it works step H3 `clamp(38px, 4.2vw, 62px)`; Features active H3 `clamp(36px, 3.7vw, 54px)` (inactive 34 px muted); dish-rail H2 `clamp(36px, min(5.4vw, 8.4vh), 88px)`; FAQ H2 `clamp(38px, min(5.6vw, 9vh), 92px)`; FAQ questions `clamp(29px, 5.3vw, 82px)`; final CTA H2 `clamp(52px, 7.6vw, 118px)`; body `clamp(16px, 1.35vw, 19px)`; chips 13 to 17 px; micro labels 11 to 13 px.
- Fonts load with `font-display: swap`, `unicode-range` latin subsets (Bricolage, Figtree) and Arabic ranges (Nastaliq). The loader waits for all three to load (progress weight 15%) so the page never shows a font swap. Only Bricolage is preloaded in the mockup.

**Builder note / my call:** the owner's own visual-system document asks for body text of at least 16 px where space allows and no decorative all-caps labels. The mockup has 15 px hero body, 15 px dish sub-lines, 11 to 13 px chip and pill text, and a few functional uppercase labels (`Shared goal`, `Your hissa . a guess`, weekday names). Raise body to 16 px on desktop and mobile where the layout allows, keep the micro labels at 12 px minimum, and keep uppercase only on functional labels (they are not decorative). Do not shrink anything to fit.

### 5.3 Navigation

A fixed bar at `top: 12px; left/right: 22px` (14 px on mobile), above everything (z-index 50), with three parts:

1. **Logo** left: حصہ, small, as in 5.2. (In the mockup it is a `<span aria-label="Hissa">`. **Builder note / my call:** make it an `<a href="#top" aria-label="Hissa, back to top">`; the old `content.ts` used the label "Hissa, back to top".)
2. **Pill** centre: black `#1a0a05` pill, 6 px padding, 4 links in cream (15 px, 600): **Buddy, How it works, Features, FAQ** (page order). Hidden at 820 px and below. **Builder note / my call:** the four links are locked; the Dish rail gets no separate nav entry or highlight (it counts as Features).
3. **CTA** right: **Get Hissa**, solid, `10px 20px` padding, 14 px.

**Goo blob.** Two absolutely positioned blobs sit under the links inside a container with an SVG filter `goo` (`feGaussianBlur stdDeviation=7` then `feColorMatrix` with alpha row `0 0 0 22 -9`). Blob fill `linear-gradient(100deg, #0B6B3A, #C8102E)`. Blob 1 chases the target with lerp 0.2, blob 2 (shorter, inset 4 px more) lags with lerp 0.08, so they stretch apart and re-merge. Target = hovered or focused link, else the "current section" link. The hovered or current link text turns white. When no section is current (final CTA and footer) the blobs fade out (`.nb`, 0.3 s). `pointerleave` and `blur` return the blob to the current link. Click prevents default and scrolls through Lenis (section 5.5). `aria-current="true"` is set on the current link.

**Per-stage CTA and rings.**

| Stage under the nav | CTA | Pill |
| --- | --- | --- |
| saffron, cream | green fill, cream text, 2 px ink border, `0 3px 0 ink` drop | ink pill |
| green (idea, Buddy, early How it works) | saffron fill, ink text, same border and drop (`body[data-nav="g"]`) | ink pill |
| ink (dish rail) | green fill, cream text, **2 px cream border and cream drop** (`ri-c`) | **cream ring** `0 0 0 2px rgba(255,246,221,.55)` (`ri-p`) |

The ring classes turn on as the ink iris front reaches each element and turn off as the FAQ cream iris reaches it (see `DR.ring`). The CTA background transition is 0.25 s; the ring transition 0.5 s. In stacked mode the stage is chosen by `data-navbg` on the section being under y = 30 px (`g` green, `k` ink, otherwise saffron).

Hover and press: CTA lifts 2 px on hover on the large final CTA only (shadow `0 4px` to `0 6px`). Footer links jump up 5 px, rotate -3 degrees, scale 1.08 on hover.

Nav highlight logic: see section 10, item 12.

### 5.4 Loader

**Concept.** A saffron "curtain" made of two torn halves covers the page. The four wordmark layers fly in from four directions as a real percent counter climbs, snap into register, then the curtain splits and the loader wordmark flies into the exact position of the hero wordmark, so the hero feels like it was assembled by the loader.

**Behaviour (as built):**

- Inline in `<head>` so it paints before images and WebGL. `html.ld` locks scroll (`overflow: hidden`, `scrollbar-gutter: stable`); Lenis is stopped until the hand-off; `header`, `main` and `footer` are `inert` and `aria-hidden` while loading. The loader is `role="status" aria-live="polite"` with a screen-reader line "Loading Hissa" then "Hissa loaded". `history.scrollRestoration = 'manual'` and `scrollTo(0,0)`, so a refresh always starts at the top.
- **Real progress.** `progress = sum(weight x value)` over: fonts 0.15 (three `document.fonts.load` promises), karahi painting 0.28 and thali painting 0.20 (streamed through `fetch`, bytes over `content-length`, capped at 98% until done), hero painting WebGL texture ready 0.12 (key `art`), hero wordmark ready 0.15 (key `wm`), page script booted 0.10 (key `boot`).
- **Pacing.** Shown value = `min(real, elapsed / 1650 ms)`, smoothed with an exponential approach (time constant 70 ms, 40 ms when forced). So the loader takes at least 1.65 s even from a warm cache (1.0 s in reduced motion), and **never more than 6 s**: at `CAP = 6000 ms` it forces to 100%. A hard failsafe finishes at 10.5 s no matter what. Typical total including the hand-off: **about 2.2 to 3.2 s**.
- **Layer entrance.** Layer i starts at progress 0.02, 0.255, 0.49, 0.725 and spans 0.275; each slides in with a back-out overshoot and a small rotation and a wobble, from left, right, bottom, top (red, green, black, white). Counter uses Bricolage 800, 28 to 40 px; a hand-drawn squiggle bar fills (`stroke-dashoffset`) under it; label by progress: **Kneading** (below 34%), **Rolling** (below 67%), **Puffing** (below 100%), **Ready**.
- **Hand-off.** On 100% (140 ms later): the curtain gets an ink 5 px drop edge (`.cut`), the wordmark does a 260 ms scale 1 to 1.05 to 1 pulse, then `wm.animate()` moves and scales the loader wordmark onto `#hs-wmc` (the hero canvas) over 800 ms (120 ms delay, `cubic-bezier(.6,0,.2,1)`) while at 200 ms the two halves slide off (0.66 s, `cubic-bezier(.7,0,.25,1)`). On finish: remove the loader and its CSS, remove `inert`, start Lenis, run `HX.refresh()`, then run queued callbacks (this starts the hero wordmark's 3.2 s demo sweep and the hero chip animations, which are paused until then).
- **Reduced motion:** layers are already in place (no slide), the counter still shows, exit is a 300 ms opacity fade; no wordmark flight. Also used when `scrollY > 8`, when the hero wordmark is missing or when `Element.animate` is missing.
- **Mobile:** wordmark width `150vw` (`112vw` capped at 1380 px on desktop).

**Builder note / my call:** keep the "what counts as loaded" list as is, but (a) point the byte-streaming fetches at the final asset URLs (after any WebP change), (b) make sure the loader script and its CSS stay inline and tiny (they are the first paint), (c) test the 6 s cap with CPU 4x and Slow 4G throttling (section 11.3), and (d) do not let the loader block the page if JavaScript fails (add a `<noscript>` style that hides it; today the sections are `visibility: hidden` until JS runs, so a no-JS visitor sees an empty page).

### 5.5 Scroll engine (Lenis) and the scroll budget

**Lenis (smooth scroll), as set in the mockup:** `new Lenis({ lerp: 0.07, wheelMultiplier: 0.8, smoothWheel: true, syncTouch: false, autoRaf: false })`; one `requestAnimationFrame` loop calls `lenis.raf(t)`; section progress is recomputed on every Lenis `scroll` event (and on native `scroll`) from the real scroll position. Lenis is stopped during the loader and **destroyed if reduced motion is on** (also when the user turns it on later). Programmatic scrolls (nav, CTAs, footer links) use `lenis.scrollTo(y, { duration: clamp(0.9 + distanceInViewports x 0.13, 1.3, 3.4) s, easing: easeInOutCubic, lock: false, force: true })`; without Lenis, native smooth scroll (instant in reduced motion). CSS: `html.lenis`, `.lenis-smooth { scroll-behavior: auto !important }`, `.lenis-stopped { overflow: hidden }`, and iframes inside the page ignore the pointer while smooth-scrolling. Touch uses native scrolling (no synthetic touch).

**One scroll story from several pinned sections.** Every pinned section is a tall wrapper (`#hs`, `#bd`, `#hw`, `#fx`, `#dr`, `#fc`) with a `position: sticky; height: 100vh` stage. Wrappers overlap with negative `margin-top` so the next stage is already in place when the previous one ends; the next stage's first frame is **identical** to the previous stage's last frame. That identical-frame rule is the transition. Only the active stage is `visibility: visible`.

Scroll positions below are in **vh of scroll from the top of the page** (computed by me from the mockup CSS and constants, not measured; verify in a browser). `p` = section progress 0 to 1.

| Stage | Wrapper height | Scroll while driven | Starts at (vh) | Notes |
| --- | --- | --- | --- | --- |
| Hero + The idea | 400vh | 300vh | 0 | `p_eff = 0.8 x P` (the section ends at 0.8 so Buddy picks up) |
| Buddy | 330vh, `margin-top -100vh` | 200vh driven + 30vh hold | 300 | hold keeps the finished table on screen |
| How it works | 420vh, `margin-top -100vh` | 320vh: first 110vh maps to `p` 0 to 0.2 (iris, "stretch"), next 160vh to 0.2 to 1, last 50vh dwell | 530 | Features starts pinning at 800 |
| Features | 450vh = 350vh + `--out` 100vh, `margin-top -150vh` | 250vh driven, then 100vh hand-off to the dish rail | 800 | `FXR = 250` |
| Dish rail | `margin-top -200vh`, spacer 440vh | hand-off 100vh (`OUT`) + rail 200vh (`RUN`) + FAQ iris 140vh (`FQ`) | 1050 | `TOT = 340` |
| FAQ list | natural flow | the sheet scrolls normally; overlaps the last 32vh of the iris | about 1490 | |
| Final CTA | 300vh | 200vh driven | about 1660 | |
| Footer | natural | about one screen | about 1860 | |

So the page is roughly **19 screens of scroll** on desktop. **Builder note / my call:** that is long for a conversion page. The nav CTA is always visible, which mitigates it, but treat total length as a hypothesis and instrument it (section 6.6). Do not shorten anything without the owner.

Constants to keep in one `timeline` module (they encode the overlaps): `HOLD = 30`, `STRETCH = 70`, `OUT = 100`, `FXR = 250`, `RUN = 200`, `FQ = 140`, `TOT = 340`, `END = 0.8` (hero/idea), `FAQ_AT = TOT + 22`, `FX_AT = 0.3`, `GET_AT = 0.62`.

**Anchor targets for the nav and CTAs (`go(i)`):** Buddy lands at Buddy progress 0.65 (cards, table and pills all in); How it works lands 130vh into its wrapper (about `p` 0.3, step 1); Features lands at `p` 0.3 (first feature open); FAQ lands 22vh after the cream iris finishes (list at the top); "Get Hissa" (`#get`) lands at final-CTA progress 0.62 with the CTA button vertically centred. In stacked mode each target is the section's top, and `#get` centres the final CTA button.

**Viewport scale fit (`HX.fit`).** Buddy and How it works are drawn at 1.25x. Where the viewport cannot hold 1.25x without overlap, the scale is the largest that fits: `bd = min(1.25, (0.942 W - 24) / (831 + min(0.31 W, 450)), (H - 92) / 690)` and `hw = min(1.25, (0.92 W - 24) / (692 + min(0.36 W, 520)), (H - 92) / 664)`. Text scale never drops below 1 (`--kc`, `--kh` = `max(1, fit)`). Computed results: 1920 x 1080 gives 1.25 for both; 1440 x 900 gives about 1.04 (Buddy) and 1.07 (How it works); 1280 x 720 gives about 0.91 and 0.95. The Features scene scale is `min(1, 0.52 W / 640, (H - 120) / 680)`. The mode switch to stacked is at **820 px or reduced motion** (class `fb` on `<html>`, decided once at load; the mockup reloads the page when the viewport crosses 820).

**Builder note / my call:** between 821 and about 1100 px wide (small laptops and tablets in landscape), the fit scale falls to about 0.7 to 0.9 while text stays at 1, which my arithmetic says will crowd or shrink the scenes (computed, not seen). Test 1024 x 768 and 1180 x 820 and raise the stacked breakpoint if needed.

---

### 5.6 Sections

Format per section: purpose, copy (exact), layout, scroll length, animation and transition in and out (progress ranges), assets, states at mobile (390) and reduced motion. Copy is exactly as in the mockup (curly quotes as in the source).

#### 5.6.1 Hero

**Purpose.** In five seconds: what it is (portion in roti and katori), who it is for (desi household), the one action. Establish the brand (wordmark, painted food, saffron).

**Copy.**
- H1: **One more roti is fine.**
- Body: **Snap your plate. Hissa tells you your portion in roti and katori. Cook, eat and cheer on your family and friends.**
- CTA: **Get Hissa**
- Hint pill at the bottom (hidden once scrolling starts): **Scroll down**
- Pinned portion chip on the roti: **1½ roti, 1 katori** and small line **about 520 kcal · estimate**
- Notification chips that float up from the steam one at a time: **Ayesha logged lunch** (small: **streak 12 days**), **Bilal cheered your plate**, **Zara joined your table**. Names are placeholders (section 10). **Decision: owner:** keep this wording ("Ayesha logged lunch", "Bilal cheered your plate"); both are app features still to build (section 12, items 1 and 2).
- The chips are `aria-hidden` (decorative).

**Layout (mirrored bento, desktop).** Stage saffron, 100vh.
- Wordmark canvas 1200 x 520 top-right: width 50%, `right: 1.5%`, `top: 15%`.
- Painting bottom-left: width 52.7% of the stage, `left: -7%`, `bottom: -9%`, then shifted right 80 px and up 10 px (`translate: 80px -10px`). The pinned chip moves with it. At this offset the roti cloth covers part of the "O" in the H1; the owner approved it, revisit in build.
- Text block bottom-right: right 4.5%, bottom 6%, width 41%, right-aligned. H1 `min(4.1vw, 50px)`/0.98; body 15 px/1.45, max 38 characters wide; CTA below.
- Portion chip: `left 30%, top 68%`, rotated -2 degrees, with a tail pointing at the roti; pops in 3.2 s after the loader hand-off. Feed chips: `left 5%, top 38%`, a 9 s loop with 3 s stagger (fade in at 8%, drift up 150 px and right 90 px, fade out by 88%).
- Chips: cream, 3 px ink border, 14 px radius, `4px 4px 0 ink` shadow.

**Motion at rest.**
- **Painting (WebGL, 1024 x 1024 canvas):** steam waver, curry shimmer, cursor tilt (spec in 6.1).
- **Wordmark (WebGL "cube chop")**: see 6.1. A 3.2 s auto sweep starts at the loader hand-off, then reacts to the cursor.
- Everything pauses when the hero is off screen.

**Transition out: Hero to The idea (scroll-driven).** Progress in the code is `p = 0.8 x P` where `P` is wrapper progress over 300vh. Ranges in `p`:
- 0 to 0.20: painting slides left (translate x from +80 to -1020 px, y -10 to +20 px) and tilts to -8 degrees (ease: smoothstep).
- 0 to 0.16: text lifts with parallax, H1 fastest (-260 px), body (-170), CTA (-90). Text opacity 1 to 0 over 0 to 0.15.
- 0 to 0.08: chips fade out. "Scroll down" hint is hidden from `p` 0.02.
- 0 to 0.20: wordmark glides to the iris origin (the centre of the pinned portion chip) and shrinks to 55%; it fades out between 0.20 and 0.30.
- 0.12 to 0.32: the green iris (a 400 px circle, scale up to about 4.2x or whatever reaches the farthest corner plus 24 px) grows from that point. The green layer ("idea") becomes visible when the iris passes 85%.
- The hero WebGL stops drawing at `p` greater than 0.36.
- The nav CTA flips to saffron when the iris covers it (`HS.nav`).

#### 5.6.2 The idea

**Purpose.** State the brand idea in one line and give three reasons to trust the app (honesty, kindness, local units).

**Copy.**
- Headline (lands word by word): **Your hissa is your share.**
- Card 1: **Portions, not points**. **Hissa speaks in katori and roti, the way your kitchen already does.**
- Card 2: **Honest about guessing**. **Every number is an estimate, and Hissa asks when it is not sure.**
- Card 3: **Kind on a heavy day**. **Over budget? You get a lighter plate and a gentle word, never a red warning.**

**Layout.** Green stage. Headline top-left (`left 5%, top 17%, width 26%`, `clamp(34px, 4.6vw, 56px)`). The painted thali, centred (`left 50%, top 52%`, square of `clamp(340px, 60vh, 560px)`) with an 8 px offset ink shadow at 25%. Cream sticker cards, 200 px wide, 3 px ink border, `4px 4px 0` shadow, slightly rotated: card 1 at `left 74%, top 12%` (+2 degrees), card 2 at `left 73%, top 63%` (-2 degrees), card 3 at `left 4%, top 62%` (-2 degrees). The left thali slice sits close to the headline (noted as open).

**Motion in (same scroll, `p` as above).**
- 0.28 to 0.44: thali drops in (scale 0.55 to 1, rotation -18 degrees to 0, opacity 0 to 1).
- from 0.31, one word per 0.02: headline words land (spring: opacity and a 24 px rise with a 2 degree tilt, 0.35/0.5 s).
- 0.50 to 0.74: the thali is cut into three slices along lines at -105, 15, 135 and 255 degrees (between the katoris) that slide apart along their bisectors by up to 96 px (scaled by plate size / 520), each with a 5 degree rotation, alternating direction. Slices are three copies of the same image, each clipped by a polygon (`HX.wedges`).
- Cards pop in at `p` greater than 0.56, 0.62, 0.68.

**Out.** The last frame (`p` = 0.8) is the first frame of Buddy.

**States.**
- Mobile and reduced motion: the whole green panel is static and stacked: headline, one whole thali (no slicing), three cards stacked (max 420 px). Padding 56/20/64. (This fallback is minimal; see section 10.)

**Assets.** `thali-1024.jpg`, the one non-keyed painting on this page: it is drawn clipped by an ellipse (`clip-path: ellipse(38.2% 35.4% at 50% 50.8%)`) to cut the round plate out of its background. The ellipse values differ slightly in each use (37.8%/35%, 38.2%/35.4%); unify them when the thali is pre-cut (see 6.2).

#### 5.6.3 Buddy

**Purpose.** The community moment (the screenshot-worthy idea): cook, eat and cheer each other on, like Strava, with a privacy promise in the copy.

**Copy.**
- Tag: **Buddy**
- H2: **Eat with your people.**
- Body: **Cheer streaks, nudge gently. Friends see you logged, never what you ate.**
- CTA: **Get Hissa** (saffron, since the stage is green)
- Scene (three friends at one table):
  - Ayesha: pills **Logged today**, **12 days** (flame icon), then **Nudge sent**
  - Bilal: **Logged today**, **7 days** (7 is the value used everywhere; see section 9, item 4)
  - Zara: **Not yet today** (dashed circle icon), **3 days**, then **Nudged**
  - Shared-goal sticker: **Shared goal / Walk after dinner**, five dots, four filled (accessible name "4 of 5 days")
  - A cheer bubble **Shabash!** (small: **from Bilal**) flies in a curve to Ayesha; a **Nudge** chip flies a curve toward Zara.
  - Scene group has an accessible label "Three friends sharing a table".
- Names and numbers are placeholders. **Decision: owner:** keep "Cheer streaks, nudge gently.", "Shabash! from Bilal" and the "Walk after dinner" goal as shown; they promise features the app does not have yet (section 12, items 1 and 3).

**Layout.** Green stage. Left: tag, H2 (`clamp(44px, 5.3vw, 78px)`, per-word pop), body (`clamp(16px, 1.35vw, 19px)`), CTA, at `left 5%, top 23%`, width `min(31vw, 450px)`, scaled by `--kc`. Right: an 860 x 740 scene scaled by `--s` (up to 1.25), anchored at `right 0.8%`. The table is an organic blob (deep green fill at 90%, a saffron 6 px line, a cream 55% 2.5 px line, drawn by `blob()` with small sine wobbles, so it never looks perfectly round). Avatars are 120 px hand-drawn SVG portraits (pink disc with a woman with black hair, saffron disc with a bearded man with a green collar, cream disc with a woman with glasses and black hair). They bob slowly, and are given a "wobble" displacement filter (`feTurbulence` plus `feDisplacementMap`) so the edges look hand-cut. Seats: Ayesha at (140, 160), Bilal at (720, 160), Zara at (430, 600) in scene units; the goal sticker in the table centre (430, 302).

**Motion in (from The idea's last frame, `p` over 200vh).**
- 0 to 0.1: the idea headline's five words fly up and out in turn (0.04, 0.055, 0.07, 0.085, 0.10); the three idea cards drift off and shrink (starting 0.02, 0.04, 0.06) and fade.
- 0.10 to 0.42: the three thali slices travel to the three seat positions, rotating toward the table centre and scaling to 56% (this is the "slices become people" transition); table lines draw in 0.20 to 0.36 and 0.26 to 0.40; table fill 0.30 to 0.46.
- 0.28 + 0.04 i: avatars pop in (back-out, 0.16 span).
- Copy: tag 0.22; H2 words 0.26, 0.29, 0.32, 0.35; body 0.42; CTA 0.46.
- Seat tags 0.44, 0.47, 0.50; pills 0.50 to 0.59; goal sticker 0.64.
- 0.66 to 0.80: the cheer bubble flies from off-scene right along a curve to Ayesha; on arrival (0.80) a saffron burst pops and sparkles rise from Ayesha.
- 0.80 to 0.90: the Nudge chip flies a curve to Zara; at 0.90 the pills "Nudge sent" (Ayesha) and "Nudged" (Zara) pop and Zara wobbles.
- Then a hold of 30vh.

**Transition out: Buddy to How it works.** See 5.6.4: the Buddy end frame is duplicated inside How it works and stays; a saffron circle opens from the table centre.

**States.**
- Mobile (820 px and below) and reduced motion: no scene animation. Tag, H2, body, CTA at the top, then a vertical list of three cards (translucent dark panel, 84 px avatar, name tag, pills wrapped), then the goal sticker and the cheer bubble as static elements. Idea cards, floating nudge and burst are hidden. The page order is the same as the reading order.
- Reduced motion on a wide screen also uses the stacked layout (`fb`).

#### 5.6.4 How it works

**Purpose.** Show that using Hissa is three taps, and that being honest about guessing is built in.

**Copy.**
- Section title (small tag): **How it works**; step index chips: **1 Snap**, **2 Confirm**, **3 Eat**.
- Step 1 (Snap): **Put your plate in the frame** / **Karahi, biryani, nihari, whatever is on the table. No weighing, no typing.**
- Step 2 (Confirm): **Tap what’s right, fix what’s off** / **Hissa asks when it isn’t sure. It never pretends to be.**
- Step 3 (Eat): **Get your hissa for the plate** / **Log it, keep your streak, and a friend cheers you on. Big day? A lighter plate, kindly.**
- CTA (appears at `p` 0.9): **Get Hissa**
- Scene text: **Hissa thinks it is… tap to fix**; candidate chips **Chicken karahi** (selected), **Beef karahi**, **Mutton karahi** (**Decision: owner:** "Chicken handi" replaced by "Beef karahi", a catalog dish); portion card **Your hissa · a guess / 1½ roti / 1 katori / about 520 kcal · estimate**; stamp **Lunch logged**; streak **11** then **12 days**; cheer **Shabash!** / **from Bilal**; **Your table** with the three avatars.
**Layout.** Saffron stage (revealed by an iris). Left column (`left 5%`, width `min(36vw, 520px)`, scaled by `--kh`): tag, step index chips, one active step at a time (H3 `clamp(38px, 4.2vw, 62px)`, body `clamp(17px, 1.4vw, 20px)`), CTA. Right: a 700 x 700 scene scaled by `--s` (up to 1.25): the painted karahi plate (580 px) with four drawn corner "camera frame" lines, candidate chips above, the portion card bottom-left, the log chips (stamp, streak, cheer), and a "Your table" slot row of three avatar-sized slots.

**Transition in (from Buddy; `p` 0 to 0.2 over the first 110vh).**
- 0 to 0.17: a saffron circle grows from the table centre (clip-path circle up to farthest corner plus 30 px) over the frozen Buddy end frame (the same Buddy copy and table are in `#hw-bcopy` and `#hw-bs`).
- 0 to 0.09: Buddy elements and the green table fade; Buddy copy fades and lifts (0 to 0.10, 0 to 0.14).
- 0.08 + 0.035 i to 0.20 + 0.02 i: the three avatars fly from their seats into the three "Your table" slots in the scene (with a small swing rotation).
- 0.14: left column fades in; step index and step 1 text appear.

**Motion (the scene, `p` 0.2 to 1 over 160vh, then a 50vh dwell).**
- Step switching: step 1 until `p` 0.42, step 2 until 0.70, then step 3.
- 0.12 to 0.22: the karahi painting drops in with a rotation and settles (back-out). Corner frame lines draw 0.20 to 0.30 (staggered 0.02), a pink focus box pulses at 0.335, a flash and a 3.5% squash at 0.385 ("shutter"). Frame lines scale out and fade 0.44 to 0.50.
- 0.46 to 0.52: the "thinks it is" label and three chips pop in; at 0.55 to 0.61 a pink ripple on **Chicken karahi**, which becomes selected (green, tick) at 0.57.
- 0.62: portion card. 0.74: **Lunch logged** stamp. 0.78: streak chip; at 0.82 it ticks 11 to 12 with a pop. 0.86 to 0.95: cheer bubble flies in a curve to the log row. 0.95: pink burst.
- Avatars bob (5 s loop). The "Your table" label is at 0.20.

**Transition out: How it works to Features.** The How it works end frame stays pinned under Features. Over Features' first 0.07, its sticker cluster and the scene chrome fade out and over the first 0.10 the left copy fades. The karahi plate then lifts out of the scene and flies into Features' katori (see 5.6.5).

**States.**
- Mobile and reduced motion: a saffron stacked panel with the title tag, then three rows separated by 3 px ink rules: a black kicker pill (**01 Snap**, **02 Confirm**, **03 Eat**), H3, body, and the **final frame of the scene at that step** (step 1 at `p` 0.36 with the corner frame; step 2 at 0.66 with chips and portion; step 3 at 1.0 with the log row, cheer and "Your table"). Then a CTA. From 900 px, rows become two columns (text, 520 px scene).
- The scene is built in JS from a template (also used for the stacked rows); **Builder note / my call:** move the static text into the HTML so crawlers and no-JS users see the steps.

#### 5.6.5 Features

**Purpose.** Prove "calm, kind and honest" with three features, each shown by a small animated scene: a budget you do not have to read, a week not a day, kind on a heavy day.

**Copy.**
- Tag: **Quiet by design**
- Feature 1: **A budget you don’t have to read** / **Calories stay in the background, always an estimate. You just see how much is left today, in a katori.**
- Feature 2: **A week, not a day** / **Hissa reads the pattern and says so in plain words. Miss a day? It is an empty plate, nothing more.**
- Feature 3: **Kind on a heavy day** / **Over budget? You get a lighter plate and a gentle word, never a red warning.**
- CTA (at `p` 0.93): **Get Hissa**
- Scene 1: **About 1,750 kcal left today** with an **estimate** pill (counts down to about 950 as meals land); katori that empties; line **half the day**; cards **Breakfast / Paratha, chai / about 280 kcal, estimate** and **Lunch / Karahi, 1½ roti / about 520 kcal, estimate**. The accessible name says "about 950 kcal left, an estimate".
- Scene 2: tag **Your week**; line **Bigger heap, bigger day. A picture, not a score. estimates**; seven plates Mon to Sun (heap size is the day's size; Wednesday is an empty plate, "no log"; Friday is today, ringed in dashed pink; Saturday and Sunday are dotted "to come"); sticker **Big lunch**; note **Missed Wednesday? It is just an empty plate, not a red mark.**; card **Hissa read your week / Lunch is your big meal, and it fits.**
- Scene 3: message bubble **Hissa, after a big lunch / Big lunch. That’s okay. / Biryani days happen. Let’s keep dinner small and easy.**; tag **Dinner, lighter**; the thali painting; chips **1 katori daal** and **1 roti**; **about 430 kcal, an estimate**.

**Layout.** Cream stage. Left: the scene (640 x 680, scaled by `min(1, 0.52 W/640, (H-120)/680)`, at `left 4.5%`). Right (`left 57%`, width `min(37%, 540px)`): the tag and an ordered list of three features; only the active feature is big (H3 `clamp(36px, 3.7vw, 54px)`, ink; a number badge turns solid ink) with its paragraph open (grid-rows 0fr to 1fr, 0.45 s); the others are 34 px muted. A "Get Hissa" CTA appears at the end.

**Transition in (from How it works).** Features' cream iris opens from the position of the logged plate (`p` 0.04 to 0.2). The plate (the keyed karahi) leaves the How it works scene exactly from where it sits, flies in an arc into the katori mouth (0.06 to 0.27, rotating -16 degrees, shrinking), and fades as it lands (0.27 to 0.32), emptying the katori by 280 then 520 kcal (0.19 to 0.25 and 0.28 to 0.35).

**Motion inside.** Acts crossfade with a small vertical move: act 1 visible 0.12 to 0.43, act 2 0.45 to 0.70, act 3 from 0.72. The active feature in the list follows (`p` below 0.45: 1; below 0.735: 2; else 3). Within acts, pieces pop at set `p` values (act 1 at 0.2 and 0.29; act 2 at 0.47 to 0.63 with a connector line drawing 0.585 to 0.63; act 3 at 0.75 to 0.92, thali drops in 0.78 to 0.85, connector lines draw 0.87 to 0.93).

**Transition out: Features to the dish rail.** For the last 100vh of Features' pin the stage stays frozen under an ink iris (section 5.6.6).

**States.**
- Mobile and reduced motion: cream stacked list. Each feature is a block (top rule, number badge, H3, paragraph, then its scene's final frame, with all pieces visible). From 900 px: two columns (text, 540 px scene). No katori fill animation (it is shown at its final level), no flying plate.

**Note on hierarchy.** The big "1,750" (up to 92 px) in scene 1 makes the calorie number the biggest thing in the scene, while the copy next to it says calories stay in the background. See section 9.

#### 5.6.6 Dish rail

**Purpose.** Show Hissa knows the dishes a desi household actually eats, and sizes them in roti, katori and plate.

**Copy.**
- H2: **Your dishes, in your portions.** ("portions." in saffron)
- Body: **Karahi, nihari, biryani, daal: Hissa sizes each one the way you serve it, in roti, katori and plate. Every number is an estimate.**
- CTA: **Get Hissa** (green with cream border and cream drop on ink)
- Rail items (name / sub-line / portion chips, each with an **estimate** pill):

| Dish | Sub-line | Portion chips | Image | In catalog? |
| --- | --- | --- | --- | --- |
| Chicken karahi | with a stack of roti | 1 katori, 1½ roti | `karahi-1024.jpg` | yes (`chicken-karahi`) |
| Daal, palak, chawal, roti | on one plate | 2 katori, ½ plate, 1 roti | `thali-1024.jpg` | n/a (generic plate name, no catalog claim) |
| Chicken biryani | a copper handi, with raita | 1 plate | `biryani-1024.jpg` | yes |
| Maash daal | with rotis on the side | 1 katori, 2 roti | `daal-1024.jpg` | yes (image shows two rotis) |
| Nihari | with a naan | 1 katori, 1 naan | `nihari-1024.jpg` | yes |
| Aloo gosht | with two rotis | 1 katori, 2 roti | `aloogosht-1024.jpg` | yes (`aloo-gosht`) |
| Haleem | a bowl, with lemon | 1 katori | `haleem-1024.jpg` | yes |
| Palak | with a roti | 1 katori, 1 roti | `palak-1024.jpg` | yes |

**Decision: owner (approved):** "Home thali" becomes "Daal, palak, chawal, roti" with sub-line "on one plate", and the maash daal chip becomes "1 katori, 2 roti" (section 9, items 5 and 6).

Catalog units come from `database/data/catalog.csv` (katori 150 g, roti 36 g, plate 250 g, naan/paratha pieces). Each image has alt text of the form "Painting of ..." (see the dish table's images in the mockup).

**Layout.** Ink stage (an ink iris over the Features end frame). Heading block at the top (`left/right 5%`, `top clamp(84px, 11vh, 112px)`): H2 left, body and CTA right (`min(360px, 30vw)`). Painted dishes in a single horizontal row near the bottom: each item `--S = min(34vw, 41vh, 420px)` square, gaps `0.18 S`, tilted slightly and offset up or down alternately (`--y` 6 px or -12 px; `--r` between -1.4 and 1.4 degrees); name (Bricolage, `clamp(26px, 2.4vw, 38px)`), sub-line, portion chips (paper pills with a pink offset shadow). A thin saffron progress bar sits at the bottom (`left/right 5%`, 4 px).

**Motion.**
- Hand-off in (100vh, `OUT`): an ink polygon "iris" (72 points, edge wobbles and turns as it opens) grows from the centre of the Features thali over the frozen Features end frame, ease in and out. Heading fades and rises (26 px) from 50% to 92% of the hand-off.
- Rail (200vh, `RUN`): the row translates left from the first dish being at about 30% of the screen width to the last at about 56%, driven by `lerp(l, ease(l), 0.5)` (half-eased). Items near the focus line grow (scale 0.86 to 1.04) and brighten (text opacity 0.82 to 1).
- The nav pill and CTA get a cream ring as the ink front passes them (5.3).

**States.**
- Mobile and reduced motion: ink panel with a rounded top (`50% 50% 0 0 / 56px`), heading, then a **horizontal scroll-snap rail** (swipe or drag; the rail is keyboard-focusable, `role="region"`, snap to start, 20 px padding) of the same eight dishes at `min(72vw, 340px)`. From 821 px the heading is two-column. No progress bar.
- On wide stacked mode (reduced motion on desktop) items are at `min(34vw, 400px)`.

**Assets.** Eight keyed paintings. See 6.2 for how they are cut out.

#### 5.6.7 FAQ

**Purpose.** Remove the doubts that stop a tap: judgment, accuracy, privacy, cost.

**Copy.** Tag **Questions**; H2 **Fair questions, straight answers.** ("straight answers." in green); right-hand line **The five things people ask first. Tap a question to open the answer.**

1. **Will Hissa tell me off for what I eat?** No. There are no red numbers, no streak shaming and no food rules. Hissa shows you a sensible portion of what you already eat. / It is not a diet app, and it is not medical advice.
2. **How honest are the numbers?** They are estimates, and every one is labelled that way. The AI only names the dish. The numbers come from Hissa’s own catalog of Pakistani dishes. / When it cannot tell two dishes apart, it asks you instead of guessing.
3. **What can my friends see?** Very little: your username, your display name, whether you logged today, your streak, nudge status, and a goal if you choose to share it. / Never your meals, photos, calories or feelings. Nudges and cheers land in the app’s inbox. There is no push notification.
4. **Which dishes does it know?** Desi home cooking and restaurant food first, each sized in roti, katori or plate. If a dish is not in the catalog, Hissa says so and lets you pick. Chips: Karahi, Biryani, Daal, Nihari, Sabzi, Paratha, Haleem, and more.
5. **What does it cost?** Hissa is free while it is in early access. We will tell you before that changes. (**Decision: owner, "Free for now".** Plain wording, no price and no pricing promise. Remove the mockup's `<!-- TODO user: pricing answer -->` marker. Revisit this answer when pricing exists.)

**Dropped by owner:** "Do you keep my photos?" is not in the FAQ until verified. Reinstate only after the code and Google's data handling are checked (section 9, item 11).

End line: **estimate** pill + **All numbers in Hissa are estimates. Hissa isn’t medical advice.**

**Layout.** A cream "sheet" with an arced top (`50% 50% 0 0 / 44px`) and a 2.5 px ink top edge, max 1180 px wide. Each question is a full-width button row: a hand-drawn speech-bubble marker (48 px, rotated -4 degrees) with a plus that turns into an "x" and fills saffron when open; the question in Bricolage `clamp(29px, 5.3vw, 82px)`; a hand-drawn ink rule above each row. Hover: question slides right 10 px and turns green; marker rotates. Open: a saffron highlighter bar grows under the question text (0.7 s) and a paper bubble (hand-drawn border radii, pink offset shadow, small tail) slides down (grid-rows 0fr to 1fr, 0.65 s). Any number of questions can be open. The answer is indented by `clamp(0, 9vw, 150px)` on desktop and not indented at 820 px and below.

**Motion in.** A cream iris opens from the FAQ link in the nav over the dish rail's last 140vh (circle with a wobbling 140-point edge, `E(q, 0, 0.7)`); then the tag (0.46 to 0.70), the heading (0.56 to 0.82) and the right-hand line (0.66 to 0.90) slide in. The list then scrolls normally.

**States.** Mobile and reduced motion: cream panel with an arced top, no iris; heading and list stacked; answer bubble full width. No motion except the open/close, which is a plain height change under reduced motion (transitions off).

**Accessibility (already built, keep):** each question is `<h3><button aria-expanded aria-controls>`, each answer is `role="region" aria-labelledby`, answers are `visibility: hidden` when closed, focus ring (use the fixed ring from 5.1: ink with a cream offset, or per-stage colour; not the mockup's pink).

#### 5.6.8 Final CTA

**Purpose.** The close: one big action, a warm picture of people at a table.

**Copy.** H2 **Pull up a chair.** (words land one by one); body **Snap your first plate. Your hissa is ready in seconds.**; CTA **Get Hissa** (large: 19 px, `17px 36px` padding, `0 4px 0` drop). Chips on the table: **Ayesha logged today / streak 12 days**, **Bilal logged today / streak 7 days** (the mockup says 4; changed to 7, the Buddy value, so Bilal is consistent; see section 9, item 4), **Shabash! / Zara sent you a cheer** (with a pink notification dot; **Decision: owner:** wording kept, a feature to build, section 12 item 1). Art accessible name: "Painted chicken karahi with rotis and a steel thali, side by side on one table". (See section 9 on the streak and the cheer.)

**Layout.** Left 42%: H2 (`clamp(52px, 7.6vw, 118px)`), body, CTA. Right: a table art block (`min(50vw, 780px)`, aspect 8:7): organic cream table blob with an offset ink shadow and a 4 px ink edge, the karahi painting top-right (84% wide, bobbing 5 px over 6 s) and the thali bottom-left (48%, rotated -8 degrees), three chips placed around it (`left -5% top 4%`; `right -4% top 27%`; `right 5% bottom -6%`).

**Motion.** Driven by its own damped value (not the Lenis-synced frame): wrapper 300vh, progress over 200vh. A saffron iris grows from the CTA button centre (`p` 0.08 to 0.50; eased in and out), the table scales and unrotates in (0.46 to 0.70), karahi flies in from the right and below (0.52 to 0.74), thali from the left and below with a spin (0.60 to 0.82), chips pop at 0.68, 0.76, 0.84. The H2 words land when the stage is 35% visible (time-based, not scrubbed). The H2 and the iris together make the saffron footer follow without a seam.

**States.** Mobile and reduced motion: saffron stacked, no iris; H2 `clamp(52px, 16vw, 96px)`, copy, table art, then chips in a left-aligned column (30 px below). The thali is rotated -8 degrees; the karahi bobbing stops.

#### 5.6.9 Footer

**Purpose.** A last brand moment, and the second place for section links and the honest disclaimer.

**Copy.** Marquee: **Snap. Confirm. Eat. Cheer. Karahi Biryani Nihari Daal Haleem Palak Aloo gosht** (loops, pink dot separators). Cheer chips: **Shabash!**, **Wah!**, **Shabash!** Links: **Buddy, How it works, Features, FAQ, Privacy, Terms** (Privacy and Terms are inert placeholders in the mockup: `<a aria-disabled="true">` with no `href`). Note: **Every number is an estimate. Hissa is not medical advice.** Legal line: **© 2026 Hissa** and **Made for the dastarkhwan**.

**Layout.** Saffron. A giant حصہ wordmark filling the page width (canvas 1600 px wide plus 64 px spare right and bottom so the layers can overshoot), below it an ink marquee band rotated -1.3 degrees that tucks behind the lettering, then a top-ruled bar: links left, note right, copyright row.

**Motion.** When the footer is 20% visible: the four wordmark layers slam apart from stacked to their offsets with a spring (`1 - e^(-3.2t) cos(16t)`), each layer 75 ms later; after about 1.6 s they "breathe" (offsets drift by about 2.4 px, +/-20%); the same cube-chop cursor effect as the hero wordmark (cursor within 5 CSS px of lettering), including a 3.2 s demo sweep on the first view. Cheer chips pop up over the lettering every 1.5 s, three at a time. The marquee speed is 172 px/s. All stop when the footer is off screen. Footer links are the same anchors as the nav and use the same scroll function.

**States.** Mobile: bar stacks to one column, note left-aligned. Reduced motion: static layered wordmark drawn in 2D, no chips, no marquee motion.

---

## 6. Cross-cutting

### 6.1 WebGL

Three WebGL canvases: hero painting, hero wordmark, footer wordmark. All use premultiplied alpha (`premultipliedAlpha: true`, `UNPACK_PREMULTIPLY_ALPHA_WEBGL`, blend `ONE, ONE_MINUS_SRC_ALPHA`) and a single full-screen quad. All pause when off screen. All fall back to a static 2D draw (reduced motion, or no WebGL).

**Cube chop (wordmark effect).** Replaces an earlier liquid warp.
- Source texture: the wordmark drawn on a 2D canvas (see 5.2) at 1200 x 520.
- Adaptive quadtree in the fragment shader. Start cell size 240 px; for each level, if the cell centre is within 1.5 x the cell size of the cursor, halve the cell. Levels: 240, 120, 60, 30 (stop after three halvings).
- Intensity `i = exp(-d^2 / 140^2) x act` with `d` = distance from cell centre to cursor in canvas pixels (140 px radius; the footer scales by `K = canvasWidth / 1200`).
- Per cell: `gap = 0.03 x act + 0.26 x i`; rotation (tumble) `(hash(cell) - 0.5) x 0.5 rad x i`; jitter inside the gap from two hashes. Cell is a rounded-square mask (`1 - smoothstep(0.5 - 1.5/s, 0.5, max(|q.x|, |q.y|))`) that blends to full coverage when `gap < 0.012` (smoothstep to 0.07), so **there is no anti-aliasing seam when idle**.
- Trigger: only when the cursor is within **5 CSS pixels** of any lettering pixel (alpha greater than 24, shadow layers included). Smoothing: cursor lerp 0.18, `act` lerp 0.10.
- Auto sweep on load: 3.2 s, cursor x from 0.18 to 0.82 of the width at mid height (trigger radius 7), starting at the loader hand-off; if the user moves the cursor first, the sweep is cancelled.
- Reduced motion: draw the 2D canvas once. Pause when `live` is false.
- Reference: `/Users/sobanahmad/Work/8x hackathon/hissa-landing-handoff/mockups/wordmark-cubes-v5.html`; footer variant adds four per-layer textures with the spring slam and breathing (mockup lines 1757 to 1836).
- **Builder note / my call:** the hero and footer shaders are near-duplicates. Make one module with a layer-count and scale option. The footer builds its textures and does a full-canvas alpha scan (about 1.7 million pixels) at boot, before it is ever seen; defer that to the first time the footer nears the viewport.

**Hero painting (steam and shimmer).** 1024 x 1024 canvas. In the fragment shader, in UV space:
- Steam mask (`y` 0.40 to 0.95, `x` 0.12 to 0.75, smoothly feathered) displaces `uv.x` by `(noise(y x 6, t x 0.5) - 0.5) x 0.035 x steam` and `uv.y` by `-(noise(x x 5 + 0.3 t, y x 4 - 0.6 t) - 0.5) x 0.02 x steam`.
- Curry shimmer mask (`y` 0.28 to 0.62, `x` 0.10 to 0.80): `uv += (noise(v x 40 + 1.3 t), noise(v x 40 - 1.1 t)) - 0.5) x 0.0035 x shimmer`.
- Cursor tilt: `uv += (cursor - 0.5) x (0.014, -0.014) x (1 - 0.3 x steam)`, cursor lerp 0.06 (relative to the stage).
- Keying in the shader: background colour = mean of six sampled pixels of a 64 px downscale (corners and edge mid-points); `alpha = smoothstep(0.11, 0.30, distance(colour, bg))`, plus a semi-transparent bluish steam term (`max(alpha, smoothstep(0.10, 0.30, c.b - bg.b) x 0.7 x smoothstep(0.38, 0.5, y))`). Premultiply on output.
- Reduced motion: draw one frame, no loop.

### 6.2 Painted dishes: how the background is removed (today) and what to do

The paintings have a flat butter-yellow background (prompt asked for it). Today there are **two** removal paths:
1. **Hero:** in the WebGL shader at draw time (above).
2. **Everywhere else (How it works plate, Features flying plate, dish rail, final CTA):** `HX.key(src, params)` in JS: sample four corner patches and bilinearly interpolate the background colour, compute each pixel's colour distance to it, **flood-fill inward from the image edges** over pixels under threshold `T1`, set alpha with `smoothstep(T0, T1, dist)` and un-premultiply the edge colour (to avoid a yellow halo), keep enclosed background pockets (inside handles) by seed points and small-component detection, optionally grow the key into the painted ground shadow (`sh` px) and run clean-ups (close holes, drop hairlines). It runs in a Web Worker with `OffscreenCanvas`; on browsers without them it runs on the main thread, one image at a time, during idle time (this can cause long tasks). For the dish rail it also trims each painting and rescales it to a common width, bottom-aligned (`TW`), so the rail reads as a set. The thali is not keyed; it is clipped to an ellipse.

Per-dish parameters used in the mockup (the starting point for any build-time pipeline):

| Painting | T0 | T1 | H0 | PK | Fit width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| karahi | 26 | 62 | 22 | 6000 | n/a | seed points (880, 486) and (62, 600) for enclosed pockets |
| biryani | 14 | 30 | 11 | 20000 | 0.90 | |
| daal | 14 | 28 | 10 | 0 | 0.86 | |
| nihari | 18 | 36 | 12 | 0 | 0.90 | cut ellipse (405, 532, 280, 136) to drop the steam above |
| aloo gosht | 14 | 30 | 55 | 30000 | 0.90 | shadow grow 60; pocket regions (100,330,230,570) and (730,290,890,480) |
| haleem | 14 | 26 | 10 | 0 | 0.74 | |
| palak | 16 | 30 | 11 | 0 | 0.90 | shadow grow 60; clean: opening radius 2, closing on (890,565,945,695) radius 10 to restore a pale rim of the roti |

**Builder note / my call (the decision the owner left to the builder):** precompute **transparent WebP** (lossy with alpha, quality about 80 to 85) at build time, one file per painting, using the same `keyPix` code run in Node (it is a pure function on an RGBA buffer, so it can run with `sharp` raw pixels) from the 1920 px originals, downscaled to the size actually used (the rail shows 420 px at most; 1024 px source is plenty for 2x). Benefits: no flood-fill work at runtime (removes the worker, the main-thread fallback and their long tasks), the same edge in every place a painting is reused (karahi is used in 5 places and currently gets two different keyers), no warm-up delay for the dish rail (the mockup waits for the worker to key six images one after another), smaller payload than PNG. Cost: a build script and a review pass for halos. Keep the hero shader's steam alpha logic: when pre-keyed, the steam above the pot should keep a soft partial alpha rather than being cut hard, so check that the hero still looks the same. Trim and fit to common size in the pipeline as well. If the builder prefers to keep runtime keying for now, ship it as is; it works.

**Risk, known:** a pale halo may remain on keyed edges (palak's roti rim has a special fix). Check every painting on saffron, cream, green and ink backgrounds at 2x zoom, since the halo shows differently on each.

### 6.3 Performance budgets

Payload (computed from file sizes in `final/`): mockup HTML 167 KB (inline CSS and JS), Lenis 17 KB, three fonts 217 KB (Noto Nastaliq Urdu is 158 KB), eight paintings 1,169 KB, total **about 1.57 MB (about 1.6 MB)**. The loader gates the first screen on fonts plus karahi and thali, about **0.64 MB**; the other six paintings (about 0.93 MB) are fetched lazily when the dish rail is within three screens (`DR.warm`, or 400 ms after boot if the worker path is available).

Targets, **Builder note / my call (proposals, not measured baselines):**
- Total transfer on a first full scroll no more than about 1.6 MB; first-gate (loader) transfer no more than about 0.65 MB; HTML gzip-compressed.
- Loader visible-to-hand-off: 2.2 to 3.2 s on broadband; cap 6 s on Slow 4G with 4x CPU throttle.
- No long task (main thread block) over 100 ms after the hand-off; none over 50 ms while scrolling, except at first keyed-image decode if you keep runtime keying.
- 60 fps scrolling on a mid-range laptop and phone (the owner noted this is **unconfirmed in headless Chrome**; test on real hardware).
- Layout shift near zero after the hand-off (all stage sizes are viewport-based; images have `width`/`height`).
- Subset the Nastaliq font: it is 158 KB for a three-glyph word. Subset by text with all layout features kept (`pyftsubset --text="حصہ" --layout-features='*'`), compare the render at all sizes, and keep a fallback. Likely saves over 100 KB. Same check for any Arabic-range need (there is none beyond the wordmark).
- Convert paintings to WebP/AVIF at build (JPEG stays as fallback only if needed). Remove the `1024` suffix from public names if the built size differs.

Pause rules that exist and must be kept: hero WebGL stops after `p` 0.36 and when the hero is off screen; Features sets class `live` only while its stage is visible (CSS animations pause otherwise); Final CTA runs its own animation frame loop only while in view; footer WebGL, marquee and chips stop when off screen and when the tab is hidden; Dish rail and FAQ compute only when the section is within about 1.5 screens.

### 6.4 Accessibility

- **Keyboard.** Everything interactive is a real link or button: nav links, CTAs, footer links, FAQ buttons, the focusable dish-rail region in stacked mode. Inactive pinned stages are `visibility: hidden`, so their links leave the tab order. The page scrolls with keyboard keys because Lenis uses native scrolling. Add a **skip link** (**Builder note / my call**) and give Privacy/Terms real hrefs or remove them. Footer links are about 27 px tall; the nav CTA is about 41 px tall; raise to 44 px targets per the owner's visual system (`min-height: 44px`).
- **Focus.** Visible focus ring on every interactive element; fix the colours as in 5.1.
- **Landmarks and headings.** `header` with `nav aria-label="Sections"`, `main`, `footer` with `nav aria-label="Footer"`. One H1 (hero). H2 per stage. The mockup's How it works and Features H2s are small 14 px tags while the step and feature titles are H3s that carry the size; keep the semantics, and check the visual hierarchy test (section 11.3). **Fix:** the Buddy end frame is duplicated inside How it works (heading, paragraph, CTA, avatars) and the three idea cards are duplicated inside Buddy; mark the duplicates `aria-hidden="true"` and `inert` so screen readers hear each heading once. The decorative scene text in How it works is already `aria-hidden`.
- **Names for graphics.** Canvas wordmarks have `role="img"` and `aria-label="حصہ, Hissa"`. Paintings have alt text in the form "Painting of ..." where meaningful, `alt=""` where decorative. Week plates have a spoken label including "about X percent of a full day, estimate". The katori graphic has a spoken label with the estimate. Streak and goal dots have spoken labels. Keep these.
- **Reduced motion.** `prefers-reduced-motion: reduce` switches to the stacked, static layout (class `fb`), turns off Lenis, uses a short fade loader, and kills all CSS animation and transition (`*{animation:none!important;transition:none!important}`), shows chips statically, draws wordmarks once, and does not run WebGL loops.
- **Moving content that starts by itself and lasts over 5 s** (hero feed loop, avatar bobbing, flame flicker, footer marquee) is a WCAG 2.2.2 concern. **Builder note / my call:** stop the hero feed after two cycles, stop the marquee when hovered or focused and after a few loops, or add a small "Pause animation" control; keep the decorative loops tiny.
- **Estimates and colour.** "estimate" is always visible text, never colour alone. Streak or logged state is shown by icon plus text.
- **Contrast** pairs and the focus defect: 5.1. Contrast must be re-run on the final render including text over keyed images.
- **Text size** and tap targets: 5.2 and the keyboard bullet above.
- **Loader.** `role="status"`, `aria-live="polite"`, the rest `inert` and `aria-hidden` (already built).

### 6.5 SEO and meta

The repo has no SEO setup for the landing beyond the current page's `<title>` and `<meta name="description">`. The page is a document inside an iframe, so it is the iframe document that would be indexed, not the Expo wrapper. **Builder note / my call:**
- Title: keep `Hissa · One more roti is fine`. Description: keep `Snap your plate. Hissa tells you your portion in roti and katori, like a friend at the dastarkhwan, not a diet app.` (from the current page). Replace the mockup's placeholder title.
- Add `<meta name="theme-color" content="#F4B41A">`, a saffron favicon (the current one is lime on graphite), `lang="en"` (present), Open Graph title/description/image and Twitter card. The OG image needs a rendered frame (the hero) and the owner's approval; do not invent a tagline.
- Static HTML for the copy that is currently built by JS (How it works steps, dish rail, Features) so crawlers and no-JS visitors see it.
- A no-JS fallback (`<noscript>` stylesheet that makes sections visible and hides the loader).
- Structured data: optional `FAQPage` JSON-LD for the five FAQ items (the photos question is dropped; the cost item uses the "Free for now" answer and must be updated when pricing exists). No Organization or app-store markup (no store listing exists).
- Whether to allow search engines to index `/landing-site/` or only the app's `/landing` route is a product decision; flag it, do not decide.

### 6.6 Analytics

There is **no analytics in the repo** (nothing for the landing or the app). Do not add a vendor. **Builder note / my call:** add `data-cta="nav|hero|buddy|how|features|dishes|final|footer"` to every Get Hissa link and `data-section` to every stage now (zero cost), and send a tiny `CustomEvent` (for example `hissa:cta`, `hissa:section`, `hissa:faq-open`) that is a no-op unless the owner later adds a provider. Hypotheses worth measuring when a provider exists: (1) nav CTA click-through versus end-of-stage CTA clicks, (2) scroll depth to Buddy, to FAQ, to the final CTA, (3) loader exit rate before hand-off (does a 2.2 to 3.2 s loader lose visitors), (4) which FAQ questions open, (5) mobile versus desktop conversion given the two different modes.

---

## 7. States summary (mobile and reduced motion)

- **One switch:** `html.fb` is set before first paint if `prefers-reduced-motion: reduce` or the viewport is 820 px or narrower. In `fb` mode: no Lenis, no pinned stages, no iris transitions, each section is a static stacked block with its end state, WebGL loops off (reduced motion) or running only when visible (mobile, if not reduced). All sections keep the same copy and CTAs.
- Mobile order of colours: saffron hero, green idea, green Buddy, saffron How it works, cream Features, ink + cream dish rail and FAQ with arc tops, saffron final CTA, saffron footer.
- **Nav on mobile:** logo and CTA only (the pill is hidden). **Builder note / my call:** the section links have no mobile access; if the owner wants them, add a menu; otherwise accept that a mobile visitor scrolls (the page is short in stacked mode).
- **Loader on mobile:** same, wordmark 150vw.
- **Builder note / my call:** mobile hero and The idea are the "minimal fallback" the owner flagged: the hero is a vertical stack (wordmark, headline, body, CTA, painting) and The idea a plain green panel. They are correct but plain; improve them (for example keep the roti chip and one notification chip on the painting, and animate the thali slicing with a simple one-shot on scroll-in) only after the desktop port is verified.

---

## 8. Assets inventory

All paintings are 1:1, requested at 2K, generated with **Superdesign, model `bytedance/seedream-5.0-lite`** (6 credits each). Common prompt style (from the generation records): "Painting of <dish>, old-school Studio Ghibli hand-painted background-art style, soft gouache textures, warm light, centered single dish on a plain flat butter-yellow background with no shadow props, no text, no hands". Superdesign project "Hissa landing", id `e15c50ea-d8f3-4e43-9d09-704eb2be38f5`. I did not run any Superdesign command in this task.

| File | Size | Purpose | Prompt subject (exact for the six newer ones) | Generation id (first 8) |
| --- | --- | --- | --- | --- |
| `karahi-1024.jpg` (1920 px original in `originals/`) | 112 KB | Hero, How it works plate, Features flying plate, dish rail, final CTA | chicken karahi with rotis in a gingham cloth (exact prompt not preserved) | not recorded |
| `thali-1024.jpg` (1920 px original) | 123 KB | The idea (sliced), Buddy, dish rail, Features act 3, final CTA | overhead steel thali with daal, curry, saag, rice and roti (exact prompt not preserved) | not recorded |
| `biryani-1024.jpg` | 196 KB | Dish rail | "chicken biryani in a copper handi pot with saffron rice and a raita katori" | c18010c4 |
| `daal-1024.jpg` | 152 KB | Dish rail | "maash daal in a steel katori with a ghee tadka and green chilli, beside two rotis" | 00338150 |
| `nihari-1024.jpg` | 160 KB | Dish rail | "nihari in a deep bowl with ginger julienne and a naan" | 969eeb14 |
| `aloogosht-1024.jpg` | 156 KB | Dish rail | "aloo gosht curry in a steel karahi with two rotis" | 02dbff07 |
| `haleem-1024.jpg` | 137 KB | Dish rail | "haleem in a bowl topped with fried onions, lemon and ginger" | e60573fe |
| `palak-1024.jpg` | 133 KB | Dish rail | "palak saag curry in a steel bowl with a roti and a dollop of butter" | 57dec52f |
| `bricolage-grotesque-800.woff2` | 39 KB | Headlines | self-hosted Google Font, latin subset, weight 800 | n/a |
| `figtree-var-latin.woff2` | 20 KB | Body and UI | variable, weights 500 to 700, latin | n/a |
| `noto-nastaliq-urdu-700.woff2` | 158 KB | Wordmark | weight 700, Arabic ranges | n/a |
| `lenis.min.js` | 17 KB | Smooth scroll | vendored | n/a |

Credits (from the quote records, whose balance field read 76 before the six newer images): **36 credits for the six dish paintings** (6 each), so about 40 left if nothing else was spent since; the karahi and thali were generated in the earlier session (6 each, 12 credits, plus a short Seedance video loop test of the karahi, `karahi.mp4`, decided against as default). The true remaining balance must be read in Superdesign; I did not look. Total spent on shipped paintings: 8 images x 6 = 48 credits.

Other assets in the mockup are **drawn in code**: avatars (3 SVG symbols with a hand-wobble filter), icons (flame, tick, clap, roti, katori, plate, spark), table blobs, week plates, the katori. They are inline `<symbol>`s and generated paths; there is no separate asset file for them. Reference video for the Supersolid-style cursor wordmark is in `/Users/sobanahmad/Work/8x hackathon/hissa-landing-handoff/reference-video/`.

Current live landing assets (`frontend/public/landing-site/assets/*.webp`, 652 KB) are replaced and can be deleted after sign-off.

---

## 9. Contradictions between the mockup and the repo's product rules

Copy or content in the approved mockup that conflicts with `CLAUDE.md`, the PRD or the friends design. **Decision: owner**, per item: items 1 to 3 keep the mockup wording (**owner accepted, feature backlog**, section 12); the dish names (item 5) and the daal chip (item 6) are **resolved**, as is the Bilal streak (item 4). Items 7 to 11 are notes.

1. **Owner accepted, feature backlog. Cheers are only for a reached shared goal, not for a plate, a log or a streak.** Owner decision: keep the mockup wording; record as a product feature to build (friends can cheer plates and streaks, not only reached goals). Section 12, item 1. The text below is the original finding. `docs/superpowers/specs/2026-11-04-friends-social-design.md` says a friend can cheer a *reached goal* (once per celebration; seen only in the achiever's inbox). The mockup shows: hero chip **"Bilal cheered your plate"**; Buddy body **"Cheer streaks, nudge gently."**; Buddy and How it works cheer bubble **"Shabash! from Bilal"** right after a lunch is logged; final CTA chip **"Shabash! Zara sent you a cheer"**. "Cheered your plate" also implies a friend can see a plate, which breaks "friends never see meals, photos, calories or feelings". Superseded proposal (not applied): "Bilal cheered your goal" and similar.
2. **Owner accepted, feature backlog. A hero "notification" that says what meal was logged.** "Ayesha logged lunch" reveals the meal slot; a friend only sees "logged today", and the inbox has no "a friend logged" event (inbox events are: friend request received, accepted, nudged, a friend reached a goal, cheers). Owner decision: keep the mockup wording; record as a product feature to build (users send each other streaks/snaps of their meals as they scan, like Snapchat). Section 12, item 2.
3. **Owner accepted, feature backlog. The shared goal "Walk after dinner" (4 of 5 days).** Habit goals in the product are "log N days in a row" or "log M days within D days", with progress computed from logged days by the backend, and "no goals about weight, calories or macros" in phase 1. Owner decision: keep the mockup wording; record as a product feature to build (goals that are not log-based, such as activity goals, can be set and shared). Section 12, item 3.
4. **Bilal's streak was 7 days in Buddy and 4 days in the final CTA.** Builder note / my call: use **7 everywhere** (the Buddy pill is the most prominent). The final CTA chip changes to "streak 7 days". Not a copy-review item. Ayesha is 12 everywhere. **Resolved.**
5. **Resolved (owner approved). Catalog names:** "Chicken handi" and "Home thali" were not catalog dishes (`database/data/catalog.csv` has `chicken-karahi`, `mutton-karahi`, `beef-karahi`, no handi, no thali slug). Applied: How it works confirm chip "Chicken handi" is now "Beef karahi"; dish rail "Home thali" is now "Daal, palak, chawal, roti" with sub-line "on one plate" (portion chips unchanged).
6. **Resolved (owner approved). The "maash daal" chip said "1 roti" but the painting shows two rotis.** Applied: chip is now "1 katori, 2 roti" (catalog unit is `roti` 36 g).
7. **"No food rules" in FAQ 1** is carried over from the old copy. There is a user-chosen avoid list in the app (v3: flags dishes and filters recipes). Not a conflict with "no restrictions imposed by Hissa", but the owner should confirm the wording ("no food rules from us" is safer).
8. **Calorie prominence.** Scene 1 of Features puts "1,750" at up to 92 px, bigger than any other element in the scene, next to copy saying calories stay in the background. Not a rule break (it is labelled estimate), but it works against the message. Consider making the katori the hero of the scene and the number secondary.
9. **"Hissa read your week: Lunch is your big meal, and it fits."** The real weekly pattern card is built by fixed templates from check-in counts (energy and stomach), not from meal size. Check the sample text against the real template wording so the landing does not promise a card the app does not show; avoid "fits" if it reads as a verdict.
10. **Nudge pills.** Ayesha shows **"Nudge sent"** while she and Bilal have logged and Zara is **"Nudged"**; from one viewer's point of view "sent" and "nudged" both appear on different people. Clarify who sent what (nudge state in the product is per friend per day).
11. **Photo claim (former FAQ question "Do you keep my photos?"): dropped by owner until verified.** The question is out of the FAQ. Reinstate only after the code and Google's data handling are checked. Notes for that check: based on reading the scan code only, `backend/src/modules/scan/scan.service.ts` resizes the photo in memory and passes it to Gemini; I found no storage upload, bucket or persisted image path in `backend/src` or `database/supabase/migrations`. This is **not verified at runtime** and does not cover Gemini's own data handling (also check hosting logs, any proxy, and Google's terms for the API tier in use).

No other conflicts found with: notifications inbox-only (FAQ 3 says no push), Gemini's bounded job (FAQ 2 says it only names the dish; the FAQ no longer makes any photo-storage claim), labelling numbers as estimates (every number checked in the mockup has an "estimate" pill or label), no Urdu UI (the Urdu text is the wordmark only), no ghost buttons.

---

## 10. Known open items, and what is left to the builder

Open decisions for the owner, and notes for the builder where I made a call:

1. **Pricing answer (FAQ 5): decided, "Free for now" (Decision: owner).** Copy in 5.6.7; drop the TODO marker. Update the answer when pricing exists. PRD lists payments as out of scope for v1.
2. **Photo storage claim: dropped by owner until verified** (the question is out of the FAQ). Reinstate only after code and Google handling are checked; see 9.11.
3. **Where "Get Hissa" goes: owner decided 2026-11-06.** The store/waitlist URL does not exist (`GET_HISSA_URL = ''`). Every Get Hissa CTA, including nav, hero, stage and final, sends `hissa:explore` once to the host and opens sign-in (iframe and WebView forms as in 3). The earlier builder note recommending scroll-to-final for all but `#get` is superseded.
4. **Placeholder names** (Ayesha, Bilal, Zara) and their numbers are placeholders (Bilal's streak is 7 everywhere, 9.4). Replace with owner-approved names or keep first names without photos.
5. **Urdu calligraphy** needs a native-speaker check (is "حصہ" correctly shaped and spelled as the brand?) or a custom-drawn wordmark later. The four-layer build means a custom drawing can replace the text with a vector path without changing the effects (the loader already uses an SVG `<path>` for the shape).
6. **1.25x scale for Buddy and How it works is viewport-clamped** (1.25 at 1920 x 1080, about 1.04 to 1.07 at 1440 x 900, below 1 at 1280 x 720; text never below 1). Decide whether small laptops accept this or need a different composition. Also test 821 to 1100 px widths (5.5).
7. **Features to Dish rail transition and the other hand-offs** need tuning in the browser: ink iris timing, wobble amplitude, the flying plate arc, and the two scenes' iris origins. The numbers in this document are the mockup's; treat them as first values.
8. **Mobile hero and The idea fallbacks are minimal.** See section 7.
9. **Pale halo risk** on keyed painting edges. Check each dish on each background colour; palak and aloo gosht needed special cleaning.
10. **CSS nesting.** The mockup's section CSS is written with native CSS nesting (`#hs { .hs-stage { ... } & canvas { ... } }`), which needs Chromium 120+, Safari 17.2+, Firefox 117+. **Builder note / my call:** flatten it (by hand while splitting into per-section files, or with a CSS transform step) so the landing survives older iOS WebViews and older browsers; there is no benefit to keeping nesting. Other newer features used: individual transform properties (`translate`, `rotate`, `scale`), `text-wrap: balance` (progressive), grid-row `0fr` to `1fr` transitions, `inert`, `overflow-x: clip`. **Minimum browsers (Builder note / my call):** iOS 16 and iOS WebView 16, plus the latest two versions of desktop Chrome, Safari, Firefox and Edge. Flatten CSS nesting as needed for that matrix and test every other feature above against it.
11. **60 fps is unconfirmed**; the owner's headless runs cannot confirm smoothness. Test on a real mid-range laptop and phone.
12. **Nav highlight logic.** As built: the pill highlights **Buddy** (index 0) from page load through the whole hero, idea and Buddy (it is the default "home"), How it works once its progress passes 0.14, Features once its progress passes 0.04, FAQ only once the dish rail is finished (so the dish rail counts as Features), and nothing (blob hidden) at the final CTA and footer. **Builder note / my call:** highlighting Buddy while the user is on the hero is wrong; show no highlight until Buddy is reached. The nav stays at the four locked links: no separate nav entry or highlight for the Dish rail (it keeps counting as Features). Confirm the Buddy fix with the owner.
13. **Wrapper background.** `frontend/app/landing.tsx` paints `landingColors.bg` (`#161718`, graphite) behind the iframe and WebView and uses a light status bar. The new page is saffron, so a dark flash shows before it loads. The only fix is in app code (`frontend/src/shared/theme/landingTokens.ts` and the wrapper), which is outside this task's scope. **Builder note / my call:** do not touch it without the owner's OK; the loader is saffron so the flash is short. Mention it in the pull request.
14. **Privacy and Terms** links are inert placeholders. A privacy page matters for an app that handles food photos; the owner decides what and when. On native, an external link would be blocked by the WebView.
15. **Source folder `scrollcraft/builds/hissa/`** holds the source of the current `landing-site` build (same files). Decide with the owner whether to delete it or keep it; do not let the two drift.
16. **Mockup cleanups noted in section 4.**

What is left to the builder (my call): module split, asset pipeline, CSS flattening, tuning the iris transitions, a11y fixes in 6.4 (including the focus ring fix in 5.1), Bilal's streak at 7 everywhere, the approved copy changes in 9 (items 5 and 6), mobile polish, performance verification on devices.

---

## 11. Build approach, verification and rollout

### 11.1 How to port the single-file mockup (Builder note / my call)

Build alongside the live site in a **new folder**, `frontend/public/landing-site-next/`, in a separate git worktree (repo rule: parallel agent work in separate worktrees). Keep `landing-site/` untouched until sign-off. Suggested structure (native ES modules, no bundler, no framework; a tiny Node script for the asset pipeline):

```
landing-site-next/
  index.html                  head, loader markup, shared SVG symbols, section shells, footer
  css/
    base.css                  tokens, reset, buttons (.cta), focus, lenis helpers
    loader.css                (also inlined in <head>; keep it tiny)
    nav.css  hero-idea.css  buddy.css  how.css  features.css  dishes-faq.css  final-footer.css
    stacked.css               the fb/mobile overrides, one file
  js/
    boot.js                   loader controller (inline copy kept for first paint), fb detection
    timeline.js               HOLD, STRETCH, OUT, FXR, RUN, FQ, TOT, END, anchor targets
    engine.js                 Lenis setup, one scroll scheduler, section progress P(), visibility gating, relayout
    nav.js                    pill, goo blobs, rings, highlight, scrollTo
    core.js                   cl/ease/lerp, fit(), blob(), wedges(), GL helpers, key (if kept)
    wordmark-gl.js            ONE cube-chop module (hero and footer)
    hero-idea.js  buddy.js  how.js  features.js  dishes-faq.js  final-footer.js
  vendor/lenis.min.js
  fonts/*.woff2
  assets/dishes/*.webp        pre-keyed, trimmed, fitted
```

- **Keep the section contract** the mockup already uses: each section exports `{ wrap, stage, layout(), up(p), init() }`; the engine computes `p` for each wrapper (with the overlaps and `PB`, `PC` special cases) and calls `up(p)` only when `p` changed. Put the cross-section hand-offs (How it works `out()`, Features `plateBox()`, Dish rail `ring`) behind explicit functions in each module, not on `window.HX`. Drop the globals.
- **Dedupe**: one `blob()`, one wordmark shader, one avatar/scene definition shared by Buddy and How it works (they must match frame for frame; today they are two copies), one set of chip/card/pill classes with section-scoped modifiers.
- **Static content in HTML**, scenes enhanced by JS. FAQ, How it works steps, dish rail and Features list text should be in the HTML so they work in stacked mode and without JS.
- **Fonts:** self-host as is, add `font-display: swap`, preload Bricolage (and Figtree if the first paint uses it), subset Noto Nastaliq (6.3). No Google Fonts link.
- **Asset pipeline:** a script (for example `frontend/scripts/build-landing-assets.mjs`, using `sharp`, which the repo already uses in the backend) that reads `final/originals/*.jpg`, resizes to the used size, runs the keyer parameters from 6.2 and writes WebP with alpha, then writes a size report. Commit the generated WebP files (small), not the 1920 px originals (they stay in the handoff folder or in `docs/design/reference/` if the owner wants them tracked).
- **Port order:** (1) shell, tokens, fonts, nav, loader; (2) engine and timeline with empty sections, verify the overlaps and visibility gating by scroll position; (3) Hero + The idea; (4) Buddy; (5) How it works (plus the Buddy hand-off); (6) Features (plus the plate hand-off); (7) Dish rail + FAQ; (8) Final CTA + footer; (9) stacked mode for each; (10) accessibility, performance, copy fixes. After step 2, steps 3 to 8 can run in parallel worktrees by section pair (hero/idea, buddy/how, features, dishes/faq, final/footer), merging against the same section contract.
- **Do not** change timing numbers while porting. First match the mockup, then tune.

### 11.2 Commands and constraints during the build

- `npm run dev:app` serves the Expo app; the landing is reachable at `/landing-site-next/index.html` directly and in the iframe wrapper once swapped. Always test **inside the iframe wrapper** at least once (scroll, wheel, focus, `innerHeight`), not only as a top-level page.
- Do not commit real `.env` files; do not push or deploy unless the owner asks. Commit `.claude-logs/` with your changes (repo rule).

### 11.3 Testing and verification plan

Use Playwright (the headless-check notes from the session: `page.goto` inside the same run, clip screenshots rather than element screenshots because element screenshots can scroll the page and cancel hover; wait about 5 s after load for the intro sweep; fail on `pageerror`).

1. **Scroll tour screenshots.** Table of checkpoints in vh from the timeline (5.5), for example: 0 (hero rest), 40, 75, 100, 130, 170, 230, 290 (idea), 300 (Buddy start), 340, 400, 480, 530 (Buddy end), 560, 640, 760, 830 (How it works), 860 (Features), 900, 980, 1060, 1100 (hand-off), 1160, 1250, 1340 (dish rail), 1400, 1480 (FAQ iris), 1520 (FAQ list), 1700, 1760, 1850 (final), footer. Take each at 1920 x 1080, 1440 x 900, 1280 x 720 and 390 x 844 (mobile stacked, scrolling the page in 700 px steps). Set the scroll with `lenis.scrollTo(y, { immediate: true })` (or disable Lenis with a query flag) and wait one frame. Keep the baseline images in the PR for the owner.
2. **Pixel-diff seams.** For each hand-off, the last frame of A and the first frame of B must match: idea end vs Buddy start; Buddy end vs How it works start; How it works end vs Features start (plate in the same place); Features end vs dish rail start; dish rail end vs FAQ start; final CTA end vs footer. Capture just before and just after the visibility switch (`b.top` crossing 1 px) and diff; target a small tolerance (for example under 0.5% changed pixels, excluding animated elements; my proposal). Also assert that exactly one stage is `visibility: visible` at every checkpoint.
3. **Reduced motion.** `emulateMedia({ reducedMotion: 'reduce' })`: the page must render stacked, no pinned stage, no Lenis, no running animation, wordmarks drawn once; compare to the stacked mobile layout; tab through.
4. **Mobile 390.** No horizontal scroll (`scrollWidth === clientWidth`), tap targets at least 44 px, body text at least 16 px, dish rail swipes with snap, FAQ opens, CTA reachable and `hissa:explore` message fires in both iframe and WebView forms.
5. **Throttled loading.** Chrome DevTools Protocol: Slow 4G (about 400 kbps) and 4x CPU slowdown. The loader must reach 100% by the 6 s cap, the failsafe must not trigger, nothing shifts after the hand-off, and no console errors. Also test with Worker/OffscreenCanvas disabled (the `?nokeyworker` path, if you keep runtime keying) and with WebGL disabled (static wordmarks).
6. **Accessibility.** axe-core on the stacked page and on each desktop checkpoint, keyboard tab-through (nav, CTAs, FAQ, footer), focus ring visibility on each stage colour, screen reader pass on headings, the duplicated Buddy copy and the FAQ, contrast spot-checks of rendered pairs (including text over images).
7. **Performance.** Lighthouse is a smoke check only. Real checks: transfer size by phase (gate vs lazy), long-task count during a scripted scroll, frame rate on a real phone and a real laptop (the owner's note: headless 60 fps is not confirmed), memory with three WebGL contexts.
8. **Copy audit.** A script that extracts every number on the page and fails if it is not within 120 characters of the word "estimate" or an accessible name that includes it (streak counts and "4 of 5 days" are the intended exceptions), and greps for banned claims (cure, treat, diagnose, healthy, unhealthy, detox, burn, fat, "good food", "bad food").
9. **Browser matrix.** iOS 16 Safari and iOS 16 WebView, and the latest two versions of desktop Chrome, Safari, Firefox and Edge (10, item 10).

### 11.4 Rollout

1. Build in `frontend/public/landing-site-next/` in a worktree. The live `landing-site/` and the old React Native fallback stay as they are.
2. Owner review on a running dev server and a throwaway preview link, with the scroll-tour screenshots and the seam-diff report.
3. Section 9 copy is decided (section 12 records the accepted risk for items 1 to 3); resolve CTA wiring (section 10, item 3) and the section 12 decision on whether to build the features or update `CLAUDE.md`/PRD before launch. Pricing text is decided; the photo question is dropped.
4. Only after owner sign-off (Builder note / my call): in one change, replace the contents of `frontend/public/landing-site/` with the new site (the wrapper keeps pointing at `/landing-site/index.html`; no app code change needed), and remove the old assets. Keep the old build available in git history; do not keep two live copies. Decide whether to delete `scrollcraft/builds/hissa/` in the same change.
5. No deploy, no push, no store link unless the owner asks.
6. After launch: instrument and judge the hypotheses in 6.6; revisit loader length, scroll length and the nav CTA behaviour with data.

---

## 12. Landing promises the app does not have yet

**Owner-accepted risk.** The owner decided to keep three mockup claims that the app does not support today. Shipping the landing before the app supports them conflicts with the current `CLAUDE.md` product rules (friends see only username, display name, "logged today", the streak, nudge state and a shared goal, never meals, photos, calories or feelings; cheers only on reached goals; goals are log-based). Before launch the owner must either **build these features** or **update `CLAUDE.md` and `docs/PRD.md` deliberately**. Until then the landing over-promises. This document does not edit either file.

Backlog entries (all three are unbuilt; "today" is per `CLAUDE.md`, the PRD and `2026-11-04-friends-social-design.md`):

1. **Cheers on plates and streaks.**
   - Landing shows: hero chip "Bilal cheered your plate"; Buddy "Cheer streaks, nudge gently." and "Shabash! from Bilal" after a logged lunch; final CTA chip "Shabash! Zara sent you a cheer".
   - App today: a friend can cheer only a *reached goal*, once per celebration, seen in the achiever's inbox. Nothing is cheerable on a plate, a log or a streak, and friends cannot see a plate.
   - Must change: let friends cheer a streak (and a logged plate as an event, without exposing meal content); add the cheer targets and inbox event types; update the friends design, `CLAUDE.md` friend-visibility rule and PRD. Wording "cheered your plate" must not imply the friend sees the meal.
2. **Share a snap / streak of your meal as you scan (Snapchat-style).**
   - Landing shows: hero chip "Ayesha logged lunch" (with "streak 12 days"), which names the meal slot.
   - App today: a friend sees only "logged today" and the streak; the inbox has no "a friend logged" event; photos are never shown to friends.
   - Must change: an in-app share-a-snap flow where users send each other meal snaps/streaks as they scan; a new inbox event; storage and retention for shared snaps (the app does not persist scan photos today, `9.11`); privacy and consent rules; rewrite the `CLAUDE.md` rule "never meals, photos" and PRD. **Also in tension:** Buddy body "Friends see you logged, never what you ate." and FAQ 3 "Never your meals, photos, calories or feelings" promise the opposite of a meal-snap feature. The owner kept the mockup wording for item 2 and said the two lines above are **wrong** for the planned behaviour: **when a user scans, a streak is automatically sent to all of their friends** (owner, 2026-11-06; not implemented yet, owner intends to build it). Exact replacement wording for those two lines is **not yet given by the owner**; the builder keeps each as a single data string and flags them for owner wording before launch. Builder note / my call: until the owner supplies wording, ship neutral text that makes no claim either way about what friends see (for example drop "never what you ate" and "never your meals, photos") and do not promise privacy that the planned feature removes.
   - Feature to build (owner request): **Auto-sent scan streak.** Each successful scan/save automatically sends the user's streak update to all their friends (friends' inbox, no push), Snapchat-style. Open product questions for the owner when building: whether the snap includes the photo or only the streak, opt-out and per-friend control, retention of any shared photo, and the CLAUDE.md/PRD friend-visibility rewrite.
3. **Non-log goals (for example "Walk after dinner").**
   - Landing shows: shared-goal sticker "Walk after dinner", 4 of 5 days.
   - App today: goals are "log N days in a row" or "log M days within D days", progress computed from logged days; no weight, calorie or macro goals in phase 1. Hissa cannot measure a walk.
   - Must change: a goal type that is not derived from logs (activity goals, self-reported check-in or manual tick), progress storage and sharing rules, and the `CLAUDE.md`/PRD goal definition. Still no goals about weight, calories or macros.
