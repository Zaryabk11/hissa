import { landingFonts } from './landingTokens';

// Hissa app tokens from docs/design/Hissa Screens.html. Lime is the only accent; there is no error red.
export type HissaTheme = {
  name: 'graphite' | 'paper';
  bg: string;
  surf: string;
  ink: string;
  muted: string;
  hair: string;
  pri: string;
  onPri: string;
  tur: string;
  rim: string;
  /** Soft lime wash and its ink, for confirmed and "asking" chips. */
  tint: string;
  tintInk: string;
  /** Stroke of the decorative arc behind the screen header. */
  arc: string;
};

export const graphite: HissaTheme = {
  name: 'graphite',
  bg: '#161718',
  surf: '#202224',
  ink: '#F2F3EE',
  muted: '#A3A6AB',
  hair: '#34373B',
  pri: '#D4FF3A',
  onPri: '#141414',
  tur: '#D4FF3A',
  rim: '#6A6D73',
  tint: '#262E12',
  tintInk: '#D4FF3A',
  arc: 'rgba(255,255,255,.08)',
};

export const paper: HissaTheme = {
  name: 'paper',
  bg: '#F0F0F0',
  surf: '#FFFFFF',
  ink: '#141414',
  muted: '#5E6066',
  hair: '#DADBDD',
  pri: '#141414',
  onPri: '#D4FF3A',
  tur: '#A5D100',
  rim: '#A9ABAF',
  tint: '#EEF7C4',
  tintInk: '#4D6100',
  arc: 'rgba(0,0,0,.08)',
};

// Same font files as the landing page (loaded by useLandingFonts).
export const hissaFonts = landingFonts;

export const hissaRadii = { control: 14, tile: 8 } as const;
export const MIN_TAP = 44;
