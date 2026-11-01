import { HERO_STAGE_ID, type Placement } from './types';

/** e1: the robot stands on the hero stage, 10% up from its bottom edge, scaled to the stage height. */
export function heroPlacement(): Placement | null {
  const el = document.getElementById(HERO_STAGE_ID);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.bottom - r.height * 0.1, size: Math.min(380, r.height * 0.8), mode: 'idle', yaw: -0.9, hero: true };
}
