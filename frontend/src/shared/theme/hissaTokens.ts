import { landingFonts } from './landingTokens';

// Dhoop (day) and Raat (night) from docs/HANDOFF_UPDATED.md section 3. Green is the CTA in both; red is brand only, never a warning.
export type HissaTheme = {
  name: 'dhoop' | 'raat';
  bg: string;
  surf: string;
  surf2: string;
  ink: string;
  muted: string;
  hair: string;
  /** Border colour of cards and buttons. */
  line: string;
  /** Hard offset shadow colour. */
  drop: string;
  pri: string;
  onPri: string;
  tur: string;
  /** Tint of the accent, with the ink to use on it. */
  turt: string;
  onTur: string;
  plate: string;
  rim: string;
  /** Kept for existing screens: a soft wash (turt) and the ink on it. */
  tint: string;
  tintInk: string;
};

export const dhoop: HissaTheme = {
  name: 'dhoop',
  bg: '#F4B41A',
  surf: '#FFF6DD',
  surf2: '#FFE7A8',
  ink: '#1A0A05',
  muted: '#5B3A22',
  hair: '#E3C78A',
  line: '#1A0A05',
  drop: '#1A0A05',
  pri: '#0B6B3A',
  onPri: '#FFF6DD',
  tur: '#0B6B3A',
  turt: '#FFD566',
  onTur: '#FFF6DD',
  plate: '#E7DFC9',
  rim: '#8C6B4E',
  tint: '#FFD566',
  tintInk: '#1A0A05',
};

export const raat: HissaTheme = {
  name: 'raat',
  bg: '#22100A',
  surf: '#35190F',
  surf2: '#4A2615',
  ink: '#FFF6DD',
  muted: '#D6BC9C',
  hair: '#5A3420',
  line: '#C9B493',
  drop: '#0A0402',
  pri: '#0B6B3A',
  onPri: '#FFF6DD',
  tur: '#F4B41A',
  turt: '#5A3A10',
  onTur: '#1A0A05',
  plate: '#4F3A2C',
  rim: '#9C8268',
  tint: '#5A3A10',
  tintInk: '#FFF6DD',
};

/** Light scheme is Dhoop, anything else Raat; `forced` (the camera) wins. */
export const pickTheme = (scheme: string | null | undefined, forced?: HissaTheme): HissaTheme =>
  forced ?? (scheme === 'light' ? dhoop : raat);

// Latin faces are shared with the landing (useLandingFonts). Urdu is a stand-in that falls back to the system Nastaliq face (package not installed).
export const hissaFonts = { ...landingFonts, urdu700: 'Noto Nastaliq Urdu' } as const;

export const hissaRadii = { control: 14, tile: 8, card: 26, panel: 36 } as const;
export const MIN_TAP = 44;
