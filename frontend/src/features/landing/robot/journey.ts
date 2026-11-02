import { fluid } from '../../../shared/theme/landingTokens';
import { onLayoutChange } from './layoutSignal';
import {
  BUDDY_ANCHOR_ID,
  HERO_STAGE_ID,
  JOURNEY_SECTIONS,
  WORD_ANCHOR_ID,
  type Burst,
  type Frame,
  type FrameContext,
  type Placement,
} from './types';

type Rect = { left: number; top: number; width: number; height: number }; // top is in page space (scroll offset added)
type Scroll = { y: number; max: number };

const REMEASURE_MS = 500; // safety net: re-measure at least this often
const MIN_GAP_MS = 150; // and never more often than this
const ROBOT_WIDTH = 0.55; // robot width as a share of its height with arms down
const MIN_MARGIN = 40; // narrower side margins than this cannot hold the robot, so it only shows at the anchors
const WALK_TAU = 1.1; // seconds: exponential smoothing of x toward its target
const WALK_MIN_SPEED = 240; // px/s floor, so the last stretch of a walk does not crawl
const WALK_START = 14; // px away from the target to start walking...
const WALK_STOP = 3; // ...and to count as arrived
const SIZE_TAU = 0.7; // seconds: the robot grows or shrinks to an anchor's size gradually, while it walks
const SETTLE_S = 1.5; // layout settles in the first moments; no walking then, so the first placement is not a walk

const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const sm = (t: number) => {
  const u = clamp01(t);
  return u * u * (3 - 2 * u);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Decides where the robot (and, at the buddy section, its handshake partner) stands each frame.
 * Scroll offset comes from `getScroll` every frame; layout is read from the DOM only when it may have changed
 * (resize, content size change, or every REMEASURE_MS) and cached in page space.
 * Returns null from getFrame whenever the layout could not be measured, so the robot hides instead of misplacing.
 */
export function createJourney(getScroll: () => Scroll) {
  let sections: { y: number; side: number }[] = [];
  let hero: Rect | null = null;
  let buddy: Rect | null = null;
  let word: Rect | null = null;
  let dirty = true;
  let lastRead = -Infinity;
  let lastY = 0;
  let vel = 0;
  let shook = false;
  let cheered = false;
  let curX = NaN; // where the robot actually is; eased toward the target x
  let curSize = 0;
  let walking = false;

  const read = (id: string, scrollY: number): Rect | null => {
    const el = document.getElementById(id);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0) || !Number.isFinite(r.top)) return null;
    return { left: r.left, top: r.top + scrollY, width: r.width, height: r.height };
  };

  const measure = (scrollY: number, now: number) => {
    sections = JOURNEY_SECTIONS.flatMap(({ id, side }) => {
      const r = read(id, scrollY);
      return r ? [{ y: r.top + r.height / 2, side }] : [];
    });
    hero = read(HERO_STAGE_ID, scrollY);
    buddy = read(BUDDY_ANCHOR_ID, scrollY);
    word = read(WORD_ANCHOR_ID, scrollY);
    dirty = false;
    lastRead = now;
  };

  const markDirty = () => {
    dirty = true;
  };
  window.addEventListener('resize', markDirty);
  const offLayout = onLayoutChange(markDirty);

  /** Which side of the page (1 right, -1 left) the robot should be on: the side of the section nearest the viewport centre. */
  const sideAt = (centreY: number) => {
    let i = 0;
    while (i < sections.length - 1 && centreY >= sections[i + 1].y) i++;
    const a = sections[i];
    const b = sections[Math.min(i + 1, sections.length - 1)];
    return a === b || (centreY - a.y) / (b.y - a.y) < 0.5 ? a.side : b.side;
  };

  const getFrame = ({ vw, vh, dt, t }: FrameContext): Frame | null => {
    const { y: sy, max: maxScroll } = getScroll();
    const now = performance.now();
    if ((dirty && now - lastRead >= MIN_GAP_MS) || now - lastRead >= REMEASURE_MS) measure(sy, now);
    if (!hero || sections.length === 0) return null;

    vel = lerp(vel, (sy - lastY) / Math.max(dt, 0.001), 0.15);
    lastY = sy;

    const mobile = vw < 780;
    // Distance from the viewport edge to where text starts: the margin the robot has to live in.
    const edge = Math.max((vw - 1120) / 2, fluid(16, 4, 40, vw));
    // Scaled to the real margin so it never crosses into the text. Phones and margins under MIN_MARGIN cannot hold it,
    // so there it only exists at the hero, buddy and footer anchors.
    const walks = !mobile && edge >= MIN_MARGIN;
    // Where the robot is headed for an anchor with weight w (0 far away, 1 there): with a margin it commits halfway,
    // and then walks. Without one it fades in and out steeply instead (grow).
    const heads = (w: number) => (walks ? (w > 0.4 ? 1 : 0) : sm((w - 0.35) / 0.45));
    const grow = (w: number) => (walks ? sm(w) : sm((w - 0.35) / 0.45));
    // Size toward an anchor's size A. With a margin it switches when the robot commits to the anchor (`on`) and is then
    // eased over time, so it never swells while still in the margin. Without one it follows the fade weight g.
    let size = 0;
    const sizeTo = (A: number, on: boolean, g: number) => {
      size = walks ? (on ? A : size) : lerp(size, A, g);
    };
    const gx = mobile ? 28 : edge / 2;
    const side = sideAt(sy + vh / 2);

    let x = side > 0 ? vw - gx : gx;
    let y = vh - (mobile ? 16 : vh * 0.18) + Math.sin(sy / 160) * 12;
    size = walks ? Math.min(240, (edge - 12) / ROBOT_WIDTH) : 0;
    let yaw = -side * 0.55;
    let mode: Placement['mode'] = Math.abs(vel) > 70 ? 'run' : 'idle';
    let isHero = false;
    let wave = false;
    const bursts: Burst[] = [];

    // Hero: stand on the stage until the user scrolls away.
    const hw = 1 - sm(sy / (vh * 0.45));
    if (hw > 0) {
      const hx = hero.left + hero.width / 2;
      const hy = hero.top - sy + hero.height - hero.height * 0.1;
      x = lerp(x, hx, heads(hw));
      y = lerp(y, hy, grow(hw));
      sizeTo(Math.min(380, hero.height * 0.8), heads(hw) > 0.5, grow(hw));
    }
    if (hw > 0.5) {
      yaw = -0.9;
      mode = 'idle';
      isHero = true;
    }

    // Buddy: walk to the "12", meet the second robot beside it, shake hands.
    let buddyPlacement: Placement | null = null;
    let wb = 0;
    let shaking = false;
    let buddyX = 0;
    if (buddy) {
      const top = buddy.top - sy;
      const dist = Math.abs(top + buddy.height / 2 - vh / 2) / (vh / 2);
      wb = 1 - sm((dist - 0.25) / 0.75);
      const sz = Math.min(buddy.height * 0.62, 280);
      const d = (sz / 3.3) * 0.8;
      const cx = buddy.left + buddy.width / 2;
      const feet = top + buddy.height - 56;
      buddyX = cx + d;
      x = lerp(x, cx - d, heads(wb));
      y = lerp(y, feet, grow(wb));
      sizeTo(sz, heads(wb) > 0.5, grow(wb));
      wave = wb > 0.92;
      if (heads(wb) > 0.5) {
        mode = 'shake';
        yaw = 1.0;
        shaking = true;
      }
      if (grow(wb) > 0.03) {
        buddyPlacement = { x: buddyX, y: feet, size: sz * (walks ? sm(wb * 1.6) : grow(wb)), mode: 'shake', yaw: -1.0, hero: false, wave, mirror: true };
      }
    }

    // Landing: arc down onto the footer wordmark, cheer, and stay.
    let lw = 0;
    let cheering = false;
    if (word) {
      lw = sm((sy - (maxScroll - vh * 0.7)) / (vh * 0.7 - 6));
      const wtop = word.top - sy;
      const target = Math.max(120, Math.min(240, word.width * 0.2));
      // Under 1200px the footer text rows are wide enough to sit under the robot's path. So it comes in later, with no
      // arc, and stands inside the wordmark panel instead of on its top edge.
      const narrow = vw < 1200;
      const lg = narrow ? sm((lw - 0.8) / 0.2) : grow(lw);
      const lh = narrow ? (lw > 0.8 ? 1 : 0) : heads(lw);
      const feet = narrow
        ? Math.min(wtop + word.height - 8, Math.max(wtop + word.height * 0.2, wtop + target))
        : wtop + word.height * 0.2;
      x = lerp(x, word.left + word.width / 2, lh);
      y = lerp(y, feet, lg) - (narrow ? 0 : Math.sin(Math.PI * lw) * vh * 0.16);
      sizeTo(target, lh > 0.5, lg);
      if (lw > 0.55) {
        mode = lw > 0.97 ? 'cheer' : 'run';
        yaw = 0;
        isHero = false;
        shaking = false;
        cheering = lw > 0.97;
      }
    }

    // Walk: x eases toward its target (exponential, with a speed floor), so side changes and anchor visits are
    // walked, not jumped. Snapped while the layout settles, on the very first frame, and while the robot is invisible.
    if (Number.isNaN(curX) || t < SETTLE_S || size < 1) {
      curX = x;
      curSize = size;
      walking = false;
    } else {
      if (walks) curSize += (size - curSize) * (1 - Math.exp(-dt / SIZE_TAU));
      else curSize = size;
      const dx = x - curX;
      const step = Math.max(Math.abs(dx) * (1 - Math.exp(-dt / WALK_TAU)), WALK_MIN_SPEED * dt);
      curX = Math.abs(dx) <= step ? x : curX + Math.sign(dx) * step;
      const away = x - curX;
      walking = Math.abs(away) > (walking ? WALK_STOP : WALK_START);
    }
    if (walking) {
      // Run in the direction of travel, even after scrolling stops, and arrive before shaking hands or cheering.
      mode = 'run';
      yaw = x > curX ? 1.2 : -1.2;
      wave = false;
      shaking = false;
      cheering = false;
    }
    x = curX;
    size = curSize;

    if (shaking && wb > 0.95 && !shook) {
      shook = true;
      bursts.push({ x: (x + buddyX) / 2, y: y - size * 0.6, count: 40, speed: 220 });
    }
    if (wb < 0.3) shook = false;
    if (cheering) {
      if (!cheered) {
        cheered = true;
        bursts.push({ x, y, count: 50, speed: 260 });
      }
    } else if (lw < 0.9) cheered = false;

    return { main: { x, y, size, mode, yaw, hero: isHero, wave }, buddy: buddyPlacement, bursts };
  };

  return {
    getFrame,
    dispose() {
      window.removeEventListener('resize', markDirty);
      offLayout();
    },
  };
}
