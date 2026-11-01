/** Poses the robot can hold. The scene eases toward whichever one its placement asks for. */
export type Mode = 'idle' | 'run' | 'shake' | 'cheer' | 'punch';

/** Where the robot stands, in viewport CSS px (y grows downward). `size` is its height in px. */
export type Placement = { x: number; y: number; size: number; mode: Mode; yaw: number; hero: boolean };

export type PlacementContext = { vw: number; vh: number };

/** What the scene tells the page. All callbacks are optional-safe: the page may ignore any of them. */
export type SceneEvents = {
  /** First frame has rendered. */
  onReady: () => void;
  /** Punch k (0, 1, 2) has landed: reveal headline word k. */
  onPunch: (k: number) => void;
  /** The intro is over: show the subtext and buttons. */
  onIntroEnd: () => void;
  /** Screen-shake offset in px, 0,0 when still. */
  onShake: (x: number, y: number) => void;
};

/** DOM id of the hero's robot stage; the scene reads its rect each frame to place the robot. */
export const HERO_STAGE_ID = 'hero-stage';
