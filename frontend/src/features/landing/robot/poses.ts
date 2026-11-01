import type { Pose } from './buildRobot';
import type { Mode } from './types';

/** Seconds into the intro at which each punch lands and reveals a headline word. */
export const STRIKES = [1.5, 2.25, 3.0];
/** A punch starts this long before it lands. */
export const WIND_UP = 0.38;

const clamp01 = (u: number) => Math.max(0, Math.min(1, u));
const L = (a: number, b: number, u: number) => a + (b - a) * clamp01(u);

/** One punch, tp = 0..1 after wind-up begins: returns [shoulder, elbow] rotation (reach out, then pull back). */
function punchArm(tp: number): [number, number] {
  if (tp < 0.26) return [L(-0.55, -0.3, tp / 0.26), L(-2, -2.3, tp / 0.26)];
  if (tp < 0.38) return [L(-0.3, -1.45, (tp - 0.26) / 0.12), L(-2.3, -0.1, (tp - 0.26) / 0.12)];
  if (tp < 0.5) return [-1.45, -0.1];
  return [L(-1.45, -0.55, (tp - 0.5) / 0.45), L(-0.1, -2, (tp - 0.5) / 0.45)];
}

type Ctx = {
  /** Wall-ish clock in seconds, drives the idle breathing and run cycle. */
  t: number;
  yaw: number;
  /** Seconds since the intro began (punch mode only). */
  ti?: number;
  /** Buddy handshake: true once the shake should wave. */
  wave?: boolean;
};

/** Target pose for a mode, plus the easing rate K (higher snaps faster). The scene eases the live pose toward it. */
export function targetPose(mode: Mode, { t, yaw, ti = 0, wave = false }: Ctx): { pose: Pose; K: number } {
  const g: Pose = { sh0: 0.05, sh1: 0.05, el0: -0.2, el1: -0.2, h0: 0, h1: 0, lean: 0, yaw, tw: 0, bob: 0 };
  const breathe = Math.sin(t * 2.4) * 0.03;
  let K = 12;
  if (mode === 'idle') {
    g.bob = breathe;
    g.sh0 = g.sh1 = 0.08 + breathe;
  }
  if (mode === 'run') {
    const ph = t * 11;
    g.h0 = Math.sin(ph) * 0.9;
    g.h1 = -g.h0;
    g.sh0 = -g.h0 * 0.8;
    g.sh1 = g.h0 * 0.8;
    g.el0 = g.el1 = -0.7;
    g.lean = 0.16;
    g.bob = Math.abs(Math.sin(ph)) * 0.06;
  }
  if (mode === 'cheer') {
    g.sh0 = g.sh1 = -2.9 + Math.sin(t * 8) * 0.25;
    g.el0 = g.el1 = -0.15;
    g.bob = Math.abs(Math.sin(t * 5)) * 0.06;
  }
  if (mode === 'shake') {
    g.sh0 = -1.5;
    g.el0 = -0.25 + (wave ? Math.sin(t * 13) * 0.2 : 0.2);
    g.sh1 = 0.1;
    g.bob = breathe;
  }
  if (mode === 'punch') {
    K = 24;
    g.sh0 = g.sh1 = -0.55;
    g.el0 = g.el1 = -2;
    g.bob = Math.sin(t * 7) * 0.04;
    g.lean = 0.06;
    STRIKES.forEach((strike, k) => {
      const tp = ti - (strike - WIND_UP);
      if (tp <= 0 || tp >= 1) return;
      const arm = k % 2;
      const [s, e] = punchArm(tp);
      g[arm ? 'sh1' : 'sh0'] = s;
      g[arm ? 'el1' : 'el0'] = e;
      g.tw = (arm ? -1 : 1) * 0.4 * Math.max(0, (s + 0.55) / -0.9);
    });
  }
  return { pose: g, K };
}

/** Exponential smoothing of the live pose toward the target; yaw turns at a fixed rate. */
export function easePose(current: Pose, target: Pose, dt: number, K: number) {
  (Object.keys(target) as (keyof Pose)[]).forEach((k) => {
    current[k] += (target[k] - current[k]) * (1 - Math.exp(-dt * (k === 'yaw' ? 8 : K)));
  });
}
