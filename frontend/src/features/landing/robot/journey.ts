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

  /** Which side of the page (1 right, -1 left) the robot is on, blended between the two sections around the viewport centre. */
  const sideAt = (centreY: number) => {
    let i = 0;
    while (i < sections.length - 1 && centreY >= sections[i + 1].y) i++;
    const a = sections[i];
    const b = sections[Math.min(i + 1, sections.length - 1)];
    return a === b ? a.side : lerp(a.side, b.side, sm((centreY - a.y) / (b.y - a.y)));
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
    const size0 = mobile ? 72 : Math.max(64, Math.min(240, (edge - 12) / ROBOT_WIDTH));
    const gx = mobile ? 28 : edge / 2;
    const side = sideAt(sy + vh / 2);

    let x = lerp(vw - gx, gx, (1 - side) / 2);
    let y = vh - (mobile ? 16 : vh * 0.18) + Math.sin(sy / 160) * 12;
    let size = size0;
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
      x = lerp(x, hx, hw);
      y = lerp(y, hy, hw);
      size = lerp(size, Math.min(380, hero.height * 0.8), hw);
    }
    if (hw > 0.5) {
      yaw = -0.9;
      mode = 'idle';
      isHero = true;
    }

    // Buddy: walk to the "12", meet the second robot beside it, shake hands.
    let buddyPlacement: Placement | null = null;
    if (buddy) {
      const top = buddy.top - sy;
      const dist = Math.abs(top + buddy.height / 2 - vh / 2) / (vh / 2);
      const wb = 1 - sm((dist - 0.25) / 0.75);
      const sz = Math.min(buddy.height * 0.62, 280);
      const d = (sz / 3.3) * 0.8;
      const cx = buddy.left + buddy.width / 2;
      const feet = top + buddy.height - 56;
      x = lerp(x, cx - d, wb);
      y = lerp(y, feet, wb);
      size = lerp(size, sz, wb);
      wave = wb > 0.92;
      if (wb > 0.5) {
        mode = 'shake';
        yaw = 1.0;
      }
      if (wb > 0.03) {
        buddyPlacement = { x: cx + d, y: feet, size: sz * sm(wb * 1.6), mode: 'shake', yaw: -1.0, hero: false, wave, mirror: true };
      }
      if (wb > 0.95 && !shook) {
        shook = true;
        bursts.push({ x: (x + cx + d) / 2, y: y - size * 0.6, count: 40, speed: 220 });
      }
      if (wb < 0.3) shook = false;
    }

    // Landing: arc down onto the footer wordmark, cheer, and stay.
    if (word) {
      const lw = sm((sy - (maxScroll - vh * 0.7)) / (vh * 0.7 - 6));
      const wtop = word.top - sy;
      const target = Math.max(120, Math.min(240, word.width * 0.2));
      x = lerp(x, word.left + word.width / 2, lw);
      y = lerp(y, wtop + word.height * 0.2, lw) - Math.sin(Math.PI * lw) * vh * 0.16;
      size = lerp(size, target, lw);
      if (lw > 0.55) {
        mode = lw > 0.97 ? 'cheer' : 'run';
        yaw = 0;
        isHero = false;
      }
      if (mode === 'cheer') {
        if (!cheered) {
          cheered = true;
          bursts.push({ x, y, count: 50, speed: 260 });
        }
      } else if (lw < 0.9) cheered = false;
    }

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
