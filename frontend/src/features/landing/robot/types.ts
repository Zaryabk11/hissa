/** Poses the robot can hold. The scene eases toward whichever one its placement asks for. */
export type Mode = 'idle' | 'run' | 'shake' | 'cheer' | 'punch';

/** Where a robot stands, in viewport CSS px (y grows downward). `size` is its height in px. */
export type Placement = {
  x: number;
  y: number;
  size: number;
  mode: Mode;
  yaw: number;
  /** True while the robot belongs to the hero, which is when the punch intro plays. */
  hero: boolean;
  /** Handshake: the hand is waving. */
  wave?: boolean;
  /** Handshake partner: the mirrored arm reaches out. */
  mirror?: boolean;
};

/** A lime particle burst at a viewport position (y down). */
export type Burst = { x: number; y: number; count: number; speed: number };

/** What the page wants drawn this frame. `null` hides the robot (nothing measured, or nothing to show). */
export type Frame = { main: Placement; buddy: Placement | null; bursts: Burst[] };

export type FrameContext = { vw: number; vh: number; dt: number; t: number };

/** What the scene tells the page. */
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

/** DOM ids the journey measures. Set with nativeID, so they only exist on web. */
export const HERO_STAGE_ID = 'hero-stage';
export const BUDDY_ANCHOR_ID = 'buddy-anchor';
export const WORD_ANCHOR_ID = 'word-anchor';

/** Page sections in order, with the side of the page the robot walks on while each is centred (data-side in the HTML). */
export const JOURNEY_SECTIONS = [
  { id: 'sec-top', side: 1 },
  { id: 'sec-idea', side: -1 },
  { id: 'sec-how', side: 1 },
  { id: 'sec-features', side: -1 },
  { id: 'sec-buddy', side: 1 },
  { id: 'sec-faq', side: -1 },
  { id: 'sec-join', side: 1 },
] as const;
