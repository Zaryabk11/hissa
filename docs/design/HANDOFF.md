# Hissa: handoff for Claude Code

## 0. How to use this file
1. Put this file and the `.dc.html` files in your repo root (or a `/design` folder).
2. Open Claude Code in the repo and paste the prompts in section 7, one at a time, in order.
3. Each `.dc.html` file is one self-contained source of truth: markup first, then a `class Component` with all the logic. They open directly in a browser. Treat them as a visual and behavioural spec. Re-implement them in your own stack (React/Next, Vue, Svelte, Swift...).

Files:
- `Hissa Landing v2.dc.html`: marketing landing page (primary).
- `Hissa Screens.dc.html`: 10 app screens, shown in two themes (Graphite and Paper).
- `TabBar.dc.html`: app bottom tab bar with raised centre Scan button.
- `Hissa Mobile.dc.html`: older mobile-only landing (scroll rail and orb). Reference only.
- The Hissa Design System PDF in `uploads/` is the brand source.

## 1. Product in one line
Hissa: snap a plate of desi food, get your portion in roti and katori (not calories). Calories stay in the background and are always labelled "estimate". Tone: a friend at the dastarkhwan saying "one more roti is fine", never a diet app. No red warnings. Streaks are shared with a Buddy who only sees that you logged, not what you ate.

## 2. Design tokens
Landing (Graphite):
- bg `#161718`, surface `#202224`, surface-2 `#26282A`, line `#303236`, line-strong `#44474C`
- text `#F2F3EE`, text-muted `#B9BCC1`, text-faint `#8C8F95`
- lime (the only accent) `#D4FF3A`, ink-on-lime `#141414`
- footer mesh accents: blue `#3B6BFF`, teal `#19C3B1`, violet `#7A5CFF` (footer only)
App screens, Paper theme: bg `#F0F0F0`, surface `#FFFFFF`, ink `#141414`, muted `#5E6066`, hair `#DADBDD`, accent lime `#D4FF3A` (on ink `#141414` for buttons), lime-dark `#4D6100` for text on light.
Radii: pills 99px, cards 28px (large 48px), controls 14px, app cards 24px.
Type: Bricolage Grotesque 800 uppercase, letter-spacing -0.045em, line-height about 0.92 for display; Figtree 400/500/600 for body. Min body 16px, min tap target 44px.
Background (all surfaces): quarter-ellipse "arc" tile (SVG 558x333, path `M.5 0V316A558 316 0 0 0 558 0` plus a bottom line, white at 7.5% opacity, black on Paper) plus a fixed fractal-noise overlay (feTurbulence baseFrequency .85, blend overlay, opacity .5).

## 3. Landing page structure (in order)
Sticky nav, Hero, lime marquee, The idea (3 cards), How it works (3 cards: Snap, Confirm, Eat), Features (4 cards), Buddy, FAQ, CTA block, Footer with the giant gradient "hissa" wordmark over a moving mesh.
CTA copy is "Get Hissa" and "See how it works". There is no early-access wording or email form.

## 4. Motion systems (each is independent, port one at a time)
1. **Hero intro (robot):** a 3D robot drops in and throws 3 punches. Each punch reveals one headline word ("One more", "roti is", "fine.") with a screen shake and a lime particle burst. Subtext and CTAs fade in after the last punch. Fallback if WebGL fails or reduced-motion: show everything immediately.
2. **Scroll journey:** the robot follows the user down the side margins, switching sides per section (`data-sec`, `data-side` = 1 or -1), runs while scrolling and idles when still. Anchors: `data-a="hero"`, `data-a="buddy"`, `data-a="word"`. On mobile (<780px) it shrinks to a small column.
3. **Buddy handshake:** at the Buddy anchor a second, light-grey robot appears; both walk together and shake hands next to the huge lime "12" streak, with a particle burst on contact.
4. **Landing:** at the end of the page the robot arcs down, lands on top of the footer "hissa" wordmark, cheers (arms up) and bursts particles.
5. **Ink buttons:** hover fill starts at the cursor entry point and expands as a circle (scale 0 to 1, 0.75s); on leave it shrinks back from the exit point. Markup: `<a data-ink data-ink-text="#colorOnHover" data-ink-base="#colorAtRest"><span data-fill></span><span>Label</span></a>`.
6. **Card flow-in:** `data-fl="l|r"` cards arc in from bottom-left or bottom-right using CSS scroll-driven animation (`animation-timeline: view()`). Provide an IntersectionObserver fallback.
7. **Footer mesh:** 3 blurred colour blobs drifting (CSS keyframes) plus a violet blob that follows the pointer. The wordmark is gradient-clipped text.
8. **Custom cursor ring:** fine pointers only, `mix-blend-mode: difference`, grows over links and buttons.
Respect `prefers-reduced-motion`. Add loading skeletons where content depends on async work (hero stage shows a shimmer until the 3D scene is ready).

## 5. 3D robot technical notes
- three.js r128 (global `THREE`), one fixed full-viewport transparent canvas, orthographic camera in pixel units (0..vw, 0..vh), `pointer-events:none`, z-index above content, pixel ratio capped at 2.
- Robot is procedural, built from boxes, cylinders and spheres: `{ root, rig, torso, sh[2], el[2], hip[2], fist[2] }`. Poses are target rotations per joint, eased with exponential smoothing. Modes: `punch`, `idle`, `run`, `shake`, `cheer`.
- **Swap to a real model:** load a `.glb` with GLTFLoader (keep under about 2 MB). Either play baked clips via `AnimationMixer` (idle, punch, run, handshake, cheer) and cross-fade, or drive the same joint names as bones. Keep the scroll-journey logic untouched.
- Known weak spot: the placeholder robot art is rough. Replace the model, not the choreography.

## 6. App screens (Hissa Screens.dc.html)
Onboarding 1 to 4 (goal, body details, activity, budget reveal), Today (budget ring plus meals plus buddy streak), Today with weekly pattern card, Camera, Scanning (lime sweep), Review chips (confirm, swap, "Daal?" question, undo), Plan sheet (plate wedge illustration), Light plan (over budget, no red), Buddy unpaired, Buddy paired, Check-in sheet (energy and stomach). Both themes use CSS variables, so build tokens once and theme by variable swap. Every screen uses the arc background.
Rules: calories always "About N kcal" or "estimate". No red anywhere. Over budget gets a lighter plate plus kind copy. Skeletons and empty states still need design (Today empty, Buddy empty, Review loading).

## 7. Prompts to paste into Claude Code (in order)
**P1 Setup:** "Read HANDOFF.md and every .dc.html here. Summarise the design tokens and component list back to me. Then propose a folder structure for a [Next.js/React/Vue] app with a /styles tokens file and a /components folder. Do not write code yet."
**P2 Tokens and background:** "Create the design tokens from HANDOFF.md section 2 as CSS variables, with Graphite and Paper themes. Implement the arc background and the noise overlay as a reusable <Background /> component. Load Bricolage Grotesque and Figtree."
**P3 Landing static:** "Build the landing page sections in section 3 from 'Hissa Landing v2.dc.html', responsive from 360px to 1440px, no animation yet. Match copy and spacing exactly."
**P4 Interactions:** "Add the ink-spread button hover (section 4.5), the cursor ring, the FAQ accordion, the marquee, and the scroll flow-in cards with an IntersectionObserver fallback. Respect prefers-reduced-motion."
**P5 3D robot:** "Port the three.js robot scene, scroll journey, buddy handshake and footer landing from 'Hissa Landing v2.dc.html' (see mk() and boot3D()) into one module (RobotScene) mounted once. Same joint names and modes. Add WebGL-failure and reduced-motion fallbacks."
**P6 App screens:** "Build the 10 app screens from 'Hissa Screens.dc.html' as mobile components (390x844) using the tokens, with Graphite and Paper theme switching. Include the TabBar from TabBar.dc.html."
**P7 States:** "Add loading skeletons, empty states and error states for Today, Review and Buddy using the same visual language."
**P8 QA:** "Audit contrast (4.5:1 text), tap targets (44px), keyboard focus and reduced-motion across the landing and the app. List issues and fix them."

## 8. Open decisions
- Final 3D asset (robot vs gorilla vs plate-and-food story). A plate-and-food alternative was explored and can be rebuilt on request.
- Optional AI-generated scroll video behind the hero or footer (use an all-keyframe MP4 or a frame sequence, with a poster frame).
- Real food photography for the "Snap" card and the camera screens (currently striped placeholders).
