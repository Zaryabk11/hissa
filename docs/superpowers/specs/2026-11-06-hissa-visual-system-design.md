# Hissa visual system and mobile UI refresh

Status: **approved for enhancing the existing mobile screens** on 2026-11-06. The landing hero and The idea are locked in the source handoff. The authenticated app direction is mostly cream screens with saffron and green highlights. The Expo screens already exist and work; the task is a visual consistency pass that preserves their behavior. Agents can implement a screen family and then review its real render without a separate mockup approval gate.

## Intent

Make Hissa feel like the same product from the public landing page through the daily portion flow. The landing should earn a visitor's attention and make **Get Hissa** obvious. The app should let someone at a Pakistani family table photograph a meal, check the dishes, and understand their portion quickly, without making them feel judged. The audience is adults 18–35 eating desi food at home or in a hostel, often opening the app at the table two or three times a day ([PRD](../../PRD.md)).

The design has a memorable public face: saffron, layered Urdu calligraphy, painted food, oversized type and one continuous scroll story. The working app carries that identity in a quieter cream layout, with saffron used for emphasis and green used for the primary action. Real dishes and people carry cultural specificity; decorative cultural patterns do not.

## Goals, limits and failure conditions

- Make the primary task or action on every screen obvious without prescribing an F-pattern reading path.
- Use clear heading hierarchy, short scannable copy, solid high-contrast actions and useful empty and error states.
- Keep the visual system recognizable across web and native, including loading, manual scan, no results and reduced motion.
- Preserve the current product behavior, route structure, privacy boundary and API contracts. This is a UI rollout, not a product feature proposal.
- Do not turn every app screen into a miniature animated landing page. The one memorable public transition belongs on the landing; app motion should clarify a person's action or a state change.
- Do not use ornamental jaali, scallops, chains, generic SaaS cards, a robot mascot, calorie-led messaging, ghost primary CTAs, red warnings or medical claims.
- Treat design choices as hypotheses. Judge them with task completion, comprehension, accessibility and performance checks, not aesthetics alone.

## Approaches considered

1. **One shared system with screen briefs — selected.** Record tokens, hierarchy, copy and behavior once, then give each existing screen a concise priority and state brief. This reduces drift between agents while letting each screen use its own layout.
2. **Separate prompts for every screen.** Easier to hand out independently, but repeated rules would diverge and the landing and app could become different brands.

The user chose a mostly cream in-app treatment. The bold saffron landing remains the brand's high-impact moment.

## Authority and source files

1. Current `AGENTS.md` product and architecture rules, then the live code and API contracts.
2. The locked landing decisions in [`docs/design/reference/landing-v2/SOURCE_HANDOFF.md`](../../design/reference/landing-v2/SOURCE_HANDOFF.md) and its [`hero-to-idea-v5.html`](../../design/reference/landing-v2/hero-to-idea-v5.html). The separate `idea-section-v2.html` and `wordmark-cubes-v5.html` explain details; the combined v5 mockup wins where they differ.
3. This approved app-wide visual system.
4. `docs/design/HANDOFF.md` and the current graphite/lime tokens are **historical references** for the shipped UI. They describe the older visual direction and must not override the new handoff. The React Native `LandingPage.tsx` is a fallback, not the shipped web landing. The live landing target is `frontend/public/landing-site/`, embedded by `frontend/app/landing.tsx`.

The archived handoff, three locked reference mockups and two painted dish assets are in `docs/design/reference/landing-v2/` and will travel with the repository once staged and pushed. The HTML references use relative asset paths. When implementing the landing, copy only needed optimized assets into `frontend/public/landing-site/assets/`.

## Brand tokens and use

| Role | Value | Use |
| --- | --- | --- |
| Saffron | `#F4B41A` | Landing field; selected app highlights and progress |
| Ink | `#1A0A05` | Main text, outlines, strong contrast |
| Green | `#0B6B3A` | Primary CTA and positive action surfaces |
| Cream | `#FFF6DD` | Main app background, text on green |
| Warm cream | `#FFF1C2` | Secondary app surfaces and sticker cards |
| Red | `#C8102E` | Wordmark layer and restrained brand accent, never a health warning |
| Pink | `#E5338A` | Rare non-text accent |

Use the 60/30/10 split as a composition starting point, not a quota: cream and ink dominate working screens, brand color supplies structure, and accents highlight only consequential elements. On the landing, saffron can dominate a whole stage. Keep color semantics stable. A warning or an estimate cannot rely on color alone.

Verified normal-text contrast ratios: ink on saffron **10.45:1**, ink on cream **17.88:1**, cream on green **6.13:1**, cream on red **5.46:1**. Green on saffron is **3.58:1** and pink on cream is **3.77:1**; do not use those pairs for normal body text. Recheck actual rendered combinations, including disabled states and image overlays, against WCAG AA: 4.5:1 for normal text and 3:1 for large text and essential UI graphics.

**Type:** Urdu `حصہ` is the primary brand name and the only planned Urdu display text; English remains the interface language under the current PRD. Use Noto Nastaliq Urdu 700 as the calligraphy stand-in until a custom wordmark is approved. Bricolage Grotesque 800 carries major headings with tight tracking. Figtree carries body, labels and controls. Use a clear H1 on each landing page, H2s for sections, and the equivalent single clear screen heading in the app. Body text should be at least 16 px where space allows, with comfortable line length and line height. Avoid all-caps eyebrow labels added only for decoration.

**Shape and depth:** The locked landing CTA is solid green with cream text, a 2 px ink border and a 3 px ink drop. Use that as an identity cue for primary actions, scaled to the app's touch layout. Do not stamp the same border, shadow and radius on every card. Use cream space, grouping and type first; add a border when it defines a control or separates information. Touch targets are at least 44 x 44 px.

**Images:** Use the approved painted dish assets, `karahi-1024.jpg` and `thali-1024.jpg`, for the public story. In the app, food imagery should show recognizable dishes or a useful scan example. Avoid faux cultural ornament and unrelated stock imagery. Preserve accessibility text for meaningful images; decorative artwork stays out of the accessibility tree.

## Layout and hierarchy

### Public landing — locked through The idea

Section order: **Hero → The idea → Buddy → How it works → Features → Dish rail → FAQ → Final CTA and footer**. Navbar order follows page order: Buddy, How it works, Features, FAQ. A black pill holds cream links; the hovered link sits on a green/red liquid blob. The small Urdu wordmark is left and a solid green CTA is right.

The hero is a mirrored bento on saffron. Painted karahi and roti enter from bottom-left; the four-layer offset Urdu wordmark occupies the upper-right. Right-aligned copy at bottom-right reads **“One more roti is fine.”**, then **“Snap your plate. Hissa tells you your portion in roti and katori. Cook, eat and cheer on your family and friends.”**, then **Get Hissa**. The painted dish is 52.7% of the panel, originally left `-7%` and bottom `-9%`, shifted 80 px right and 10 px up in the approved composition. The 1200 x 520 wordmark canvas occupies 50% width at right `1.5%`, top `15%`. A portion chip stays pinned to the roti; one community notification floats up at a time on a 9-second loop with 3-second staggering. Names in those chips are placeholders.

The wordmark's approved WebGL effect is **cube chop**: 240/120/60/30 px adaptive cells around the pointer, active only within 5 CSS px of an opaque letter pixel, with a short 3.2-second intro sweep. The hero-to-Idea transition is scroll-driven: artwork and chips leave, copy lifts, the wordmark moves toward the roti-chip origin and shrinks, then a green iris covers the hero. The hero WebGL pauses after it is covered. On green, **“Your hissa is your share.”** lands word by word; the thali drops and splits into three slices, and cream sticker cards appear: **Portions, not points**, **Honest about guessing**, **Kind on a heavy day**. Use the combined v5 mockup for timing and composition.

Buddy onward remains **unlocked**. The handoff's next intended design is a community moment where the three thali slices become three people: cook, eat and cheer each other on, like a private Strava-like moment. The remaining sections must be designed and reviewed one by one before implementation. Do not fill them with guessed layouts or promise features that the app does not have. The current product has friends, personal streaks, nudges and shared goals, but no public meal feed or chat.

### Authenticated app — approved direction for existing screens

Use a mostly cream canvas, ink headings, warm cream grouping, green primary action and small saffron highlights. Preserve the existing Expo Router information architecture and the centered Scan action. Make a screen's first decision visible without scrolling when feasible: **Today → scan a meal; Review → confirm dishes; Plan → save meal; Feel → answer or skip; Social → see friends or add one**. Only one action should read as primary at a time. Secondary actions can be quiet text or filled neutral controls; avoid outline-only buttons that compete with the primary action.

Keep the current phone content column as a starting point, then verify on 320–430 px phones and wider web views. Use safe areas, natural scrolling and content-based height. Long translated names, font scaling and error copy must not clip. The camera remains a focused full-screen task; keep controls readable over its live preview. On wide layouts, use breathing room or one supporting pane, never stretch a form across the viewport. The landing's overlapping art is for storytelling; app controls must stay stable and easy to hit.

### Motion

The landing may use the approved scroll story and cursor interaction. In the app, animate a state change only when it helps explain it, such as a scan progressing, a chosen dish becoming confirmed, a portion changing, or a saved meal appearing on Today. Provide static equivalents when reduced motion is requested. Animation must never delay the action, block the CTA, hide an estimate or become necessary to understand the result. Pause off-screen WebGL and test load cost on a phone.

## Screen briefs for agents

| Screen family | First visual priority | Primary action / state | Guardrail |
| --- | --- | --- | --- |
| Sign-in and onboarding | What Hissa does, then one question per step | Continue or sign in | Keep data requests plain; do not imitate a diet quiz |
| Today | Today's portion context and next meal | Scan a meal | Nutrition numbers are estimates; week and recipe modules stay secondary |
| Camera, scanning, no plate | Plate framing and progress | Capture / retry / choose dishes manually | Show a clear path when AI is unavailable or the daily cap is reached |
| Review | Recognized dishes and uncertain items | Confirm or correct before saving | Never silently guess; show avoided items without food-shaming |
| Plan | Roti/katori portion recommendation | Save meal | Calorie values are estimates; a light plan is offered kindly |
| Food & Feel | The due check-in question | Answer or skip | No diagnostic or causal language; options remain in service-defined order |
| Social and inbox | Friend activity that is safe to share | Add friend, cheer or nudge when available | Show only allowed friend fields; no meals, photos, calories or feelings |
| Profile and avoids | Identity and current choices | Save changes | Preserve clear account and food-avoid controls |
| Meal history and detail | Date, dishes and portions | View, edit or delete a meal | Separate destructive actions clearly; use estimate labels |
| Recipes | Reviewed, relevant suggestions | Open recipe or mark not for me | An empty state is expected until recipes are reviewed |

Agents inspect each existing screen's loading, empty, error, success and long-content states, then carry them through the visual refresh. Empty states give a next action; errors say what happened and how to retry. Interface copy uses active verbs, sentence case and consistent action names. Use food and family language only where it clarifies the task; never replace a functional label with a joke.

## Agent workflow after design approval

1. Read `AGENTS.md`, the current status document, this design, the source handoff and the target screen's code. Check the live code where status prose is stale.
2. For a landing section, make a visual mockup, review it with the user, and lock it before designing the next section. The current next section is Buddy. Do not generate paid assets or confirm a Superdesign quote without the user's explicit approval of its exact credit price.
3. For an existing app screen, inspect its current behavior and states; note the user task, hierarchy and primary action. Apply the shared tokens and visual language directly in Expo. Make only UI changes required by that screen; do not create a competing local palette or speculative feature.
4. Implement one coherent screen family at a time in a separate git worktree if parallel agents are used. Do not let agents edit one another's worktrees. Preserve routes, APIs and product rules.
5. Review the changed screen in a real render. Check mobile and wide layouts, contrast, font scaling, focus, 44 px targets, reduced motion, loading, empty and error states. Verify the main task end to end, then record evidence and any deviations in the handoff.
6. Do not commit, push or deploy without the user's request. If committing is requested, include `.claude-logs/` with the changes as `AGENTS.md` requires.

The mobile implementation plan covers the **existing Expo screens**, beginning with shared theme and UI primitives, then the core portion flow. It does not require standalone mockups before editing. The landing's next design slice remains Buddy whenever landing work resumes; do not assign unapproved Buddy-to-footer layouts to implementation agents.

## Open visual details, not blockers to the mobile refresh

- Complete and approve landing Buddy, How it works, Features, Dish rail, FAQ and Final CTA one section at a time. The landing source handoff explicitly leaves them open.
- Use painted artwork in an app screen only when it helps that screen's task and holds up in a real render. Do not reuse the hero art as a default background behind controls.
- Validate the Urdu calligraphy on native devices or approve a custom wordmark; resolve any image-keying halo, mobile hero collision, keyboard access, contrast and performance issues during the landing build.
- Preserve the current live landing action: its `data-explore` links send `hissa:explore` to `frontend/app/landing.tsx`, which opens sign-in. The new **Get Hissa** CTA should use that route unless the user later chooses a store or waitlist. The unused React Native landing has an empty `GET_HISSA_URL` placeholder; do not treat it as the live CTA contract.
