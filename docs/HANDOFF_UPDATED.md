# Hissa app: handoff for Claude Code

## 0. How to use this file
1. Put this file, `Hissa App.dc.html`, `Mascot.dc.html`, `Scene.dc.html`, `Thali.dc.html` and the `assets/` folder in your repo under `/design`.
2. Open Claude Code in the repo and paste the prompts in section 9, one at a time, in order.
3. `Hissa App.dc.html` is the source of truth for behaviour, copy and layout. It is one file: markup first (an `<x-dc>` template), then a `class Component` holding all state and logic. Open it in a browser to see it run. Treat it as a spec and re-implement it in your stack (React/Next, Vue, Svelte, React Native). Do not ship the `.dc.html` runtime.
4. Nothing here has been visually QA'd in a real browser yet. Expect spacing fixes.

## 1. Product
Hissa: snap a plate of desi food, get your portion in roti and katori, not calories. Calories stay in the background and are always labelled "estimate" or "About N kcal". Users are desi home eaters who are working out and find calorie apps cold. Tone: calm, adult, direct. A coach, not a cartoon and not a diet app.
- No red warnings. Going over budget shows a lighter plate and kind copy.
- A streak is shared with one friend. The friend sees that you logged, never what you ate.
- Business goals, in order: log a meal, keep the streak, add a friend.

## 2. Design principles (apply to every screen)
1. Visual hierarchy: the most important element is the largest. Secondary info is visibly quieter.
2. One obvious primary action per screen. Solid fills only. No ghost or outline-only buttons. Secondary actions use a tonal fill (`surf2`).
3. Colour 60-30-10: neutrals, brand, accent for CTAs and key data. Check WCAG (4.5:1 text, 3:1 large text and UI).
4. Type: H1 states the screen's purpose, H2 organises sections, body 16px minimum, no decorative body faces.
5. Conversion first: every choice serves logging, the streak or the friend. Remove friction.
6. Design for the real audience, treat decisions as hypotheses, test them.

## 3. Visual system
Painted, sticker-style UI. Culture comes from food and people, not ornament. No chains, jaali or scallop patterns.

Palette: saffron `#F4B41A`, ink `#1A0A05`, green `#0B6B3A`, red `#C8102E` (brand only, never warnings), cream `#FFF6DD`, pink `#E5338A` (accent and buddy).

Themes are CSS variables on the phone wrapper. Build tokens once and swap by variable.

| Token | Dhoop (day) | Raat (night) |
|---|---|---|
| bg | `#F4B41A` | `#22100A` |
| surf | `#FFF6DD` | `#35190F` |
| surf2 | `#FFE7A8` | `#4A2615` |
| ink | `#1A0A05` | `#FFF6DD` |
| muted | `#5B3A22` | `#D6BC9C` |
| hair | `#E3C78A` | `#5A3420` |
| line | `#1A0A05` | `#C9B493` |
| drop | `#1A0A05` | `#0A0402` |
| pri (CTA) | `#0B6B3A` | `#0B6B3A` |
| onpri | `#FFF6DD` | `#FFF6DD` |
| tur (accent) | `#0B6B3A` | `#F4B41A` |
| turt (tint) | `#FFD566` | `#5A3A10` |
| onTur | `#FFF6DD` | `#1A0A05` |
| plate | `#E7DFC9` | `#4F3A2C` |
| rim | `#8C6B4E` | `#9C8268` |

Type: Bricolage Grotesque 800, uppercase, tight tracking for headings and numbers. Figtree 400/500/600/700 for body. Wordmark is Urdu حصہ in Noto Nastaliq Urdu 700, drawn as four stacked offset layers (red, green, ink, cream). The Urdu face is a stand-in. Check it on a native reader.

Components (see the `<style>` block in the App file for exact values):
- Card `.card`: 2px ink border, 4px hard offset drop, radius about 26.
- CTA `.cta`: solid green, cream text, 2px border, 3px drop, round arrow chip on the right. Only one per screen.
- Secondary button `.btn2`: tonal fill, same border.
- Panel `.panel`: cream sheet with 36px top radius over the backdrop.
- Speech bubble `.say`: cream, bordered, tied to Dabbu.
- Segmented control `.seg`, bottom sheet `.sheet` with scrim, toast with optional Undo, floating cream dock with a raised green Scan button.
- Grain overlay `.grain` over everything.

Backdrop (`Scene.dc.html`): faint gingham tablecloth, a warm glow, and the steel thali (`assets/thali-plate.png`) turning slowly at the lower left, fading into the page colour. No hills, clouds or sun. Props: `tod`, `night`.

Transition: a green iris wipe that opens from the tap point with the wordmark in the middle (cover 340ms, reveal 460ms). Every `go(screen)` runs through it. Skip it when `prefers-reduced-motion`.

## 4. Dabbu, the character (`Mascot.dc.html`)
A calm portion dial. No face, no limbs. Cream rim, four ring segments (plate quarters) that fill with mood, and a green centre disc (pink for the buddy) holding one line symbol. Props: `mood`, `tone` (`lime` = green, `cloud` = pink buddy), `size`, `kick` (change the value to trigger a hop). The symbol drifts slightly toward the pointer. Build as one SVG component with CSS keyframes.

| Mood | Symbol | Ring fill | Motion |
|---|---|---|---|
| idle | bowl | half | float |
| wave | bowl | 3/4 | wiggle |
| happy | check | 85% | small hop |
| cheer | check + 2 sparkles | full | big hop |
| hungry | bowl | almost empty | tremble |
| think | rotating dots | 1/3 | sway |
| curious | ? | half | tilt |
| wow | sparkle | 70% | hop |
| oops | dash | 1/4 | shiver |
| sleepy | moon | 40% | slow breathe |
| content | check | full | float + breathe |
| lonely | plus | 1/5 | float |

Dabbu speaks in short, adult lines. Tapping it shows a habit line ("Consistency beats perfection.").

## 5. Screens and states
One state machine, `screen` in: `splash, goal, body, act, reveal, loading, today, camera, scan, fail, review, plan, buddy, profile`. Sheets: check-in, add dish. Day/week view lives inside `today`.

1. **Splash**: stacked wordmark, headline "One more roti is fine.", subline, one CTA "Get Hissa", floating friend-activity chips, Dabbu waving.
2. **Onboarding 1 to 4**: goal (lighter, steady, build), body (age, height, weight, sex), activity (3 levels), budget reveal (ring counts up). Persistent header: back, 4-step progress, Dabbu with a bubble. Panel cards over the backdrop.
3. **Loading**: skeleton of Today.
4. **Today**: greeting, Dabbu and bubble, budget ring (72 ticks that drain as you eat), "About N kcal left", check-in prompt after a log, meal list (photo tile, name, time, about kcal, expand to items, Remove), buddy streak card, day/week toggle with a weekly pattern.
5. **Camera**: live-view circle showing the plate, corner brackets, shutter. Dabbu: "Frame the whole plate."
6. **Scan**: plate photo with a sweep line, step list. Dabbu: "Reading your plate."
7. **Fail**: "Plate not detected", retake CTA, add manually.
8. **Review**: dish cards (photo, name, quantity, minus/plus, remove with 5s Undo), one question card "Daal or haleem?", "Add a dish" sheet, CTA "Show my plan".
9. **Plan**: plate-wedge illustration, hunger control (Light, Moderate, High), tappable rows that highlight wedges. Over budget: lighter plate and kind copy, never red. CTA logs the meal.
10. **Check-in sheet**: energy (3) and fullness (Over-full, Satisfied, Still hungry), then a note about the next plate.
11. **Buddy**: unpaired = your username `@zaryab` with Copy, a "Find a friend" search by username (suggestions first, results as you type, "Start streak" per row, empty state). Paired = two Dabbus, shared streak count, 7 day dots, You and friend rows, "Nudge {name}".
12. **Profile**: edit goal, body, activity, buddy. The budget recalculates.

Still to design and build: empty Today, empty Buddy, Review loading, network error states, offline.

## 6. Logic to port (all in `class Component`)
- `budget()`: Mifflin-St Jeor times an activity multiplier, adjusted by goal.
- `plan()`: scales portions to the remaining budget and the hunger setting. Over budget returns the light plate.
- `DISH` catalog: name, unit (katori, roti, paratha, naan, cup), kcal, flags. `qtyTxt()` formats the amount.
- `imgFor(text)`: picks a painted photo by dish keyword, falls back to the thali.
- `findFriends(q)`: filters a sample user list. Replace with a real username search endpoint.
- Meal log, Undo (4.5s toast), 5s dish removal Undo, ring tween (rAF), `celebrate()` confetti, `go()` plus `irisTo()` for transitions.

## 7. Copy rules
- Adult, short, direct. No baby talk, no "yummy", no "my tummy", no exclamation marks except sparingly.
- Say what happened and what to do next. Example: "No meals logged yet. Scan your first plate."
- Calories only as "About N kcal" or "estimate".
- Never shame. Over budget: "You have eaten well today. A lighter plate keeps you balanced."

## 8. Assets
`assets/thali-plate.png` (transparent cutout), `karahi.jpg`, `daal.jpg`, `haleem.jpg`, `nihari.jpg`, `saag.jpg`, `aloogosht.jpg`. These are painted placeholders. Used in meal tiles, review rows, camera and scan. Commission or generate a full set for the real dish list. Keep tile crops square and the plate as a transparent cutout.

Accessibility: tap targets 44px minimum, visible focus, `aria-live` on Dabbu's bubble, labelled form controls, `prefers-reduced-motion` turns off every loop and the iris.

## 9. Prompts to paste into Claude Code (in order)
**P1 Setup:** "Read HANDOFF.md and every .dc.html and the assets folder in /design. Summarise the tokens, screens and components back to me in under 300 words. Then propose a folder structure for a [Next.js PWA / React Native Expo] app with a tokens file, a components folder and a state module. Do not write code yet."
**P2 Foundations:** "Create the theme tokens from section 3 as CSS variables (or a theme object) with Dhoop and Raat. Build Background (gingham plus plate), Grain, and load Bricolage Grotesque, Figtree and Noto Nastaliq Urdu. Build Wordmark."
**P3 Components:** "Build Card, Cta, SecondaryButton, Panel, SpeechBubble, Segmented, Sheet, Toast, Dock and the IrisTransition from section 3. Then build Dabbu from section 4 as one SVG component with every mood. Add a Storybook page or a /dev route that shows all moods and both themes."
**P4 State and logic:** "Port the logic in section 6 into a typed state module with unit tests for budget() and plan(). No UI yet."
**P5 Screens, part 1:** "Build splash, onboarding 1 to 4, loading and Today (day and week) wired to the state module. Match copy exactly."
**P6 Screens, part 2:** "Build camera, scan, fail, review, plan and the check-in and add-dish sheets. Use a stub for the scan result so the flow runs end to end."
**P7 Buddy and profile:** "Build Buddy (unpaired search by username, paired view, nudge) and Profile. Mock the username search behind an interface so a real API can replace it."
**P8 States:** "Add empty, loading and error states for Today, Review and Buddy in the same visual language."
**P9 QA:** "Audit contrast (4.5:1), tap targets (44px), focus order and reduced-motion on every screen, in both themes. List issues and fix them."

## 10. Open decisions
- Backend: auth, usernames, friend graph, streak and nudge service.
- Scan: the vision model and the confidence rules behind "Daal or haleem?".
- Final food photography or illustration for the dish catalog.
- Native check of the Urdu wordmark face.
