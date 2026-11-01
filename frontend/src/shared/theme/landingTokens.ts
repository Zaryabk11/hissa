import { Dimensions } from 'react-native';

// Landing page tokens (dark / Graphite only). Lime is the only accent; the mesh colors are footer-only.
export const landingColors = {
  bg: '#161718',
  surface: '#202224',
  surface2: '#26282A',
  line: '#303236',
  lineStrong: '#44474C',
  lineNav: '#2C2E31',
  linePill: '#3A3C40',
  lineOutline: '#4A4D52',
  text: '#F2F3EE',
  textMuted: '#B9BCC1',
  textFaint: '#8C8F95',
  textGrey: '#A3A6AB',
  textLink: '#D5D7DB',
  ringTrack: '#34373B',
  plate: '#2A2C2F',
  stripeDark: '#1F2022',
  inkFaint: 'rgba(20,20,20,.35)',
  inkRing: 'rgba(20,20,20,.22)',
  barGrey: '#6A6D73',
  lime: '#D4FF3A',
  inkOnLime: '#141414',
  limeSelected: '#26301A',
  limeAlpha16: 'rgba(212,255,58,.16)',
  limeAlpha25: 'rgba(212,255,58,.25)',
  limeAlpha35: 'rgba(212,255,58,.35)',
  limeAlpha15: 'rgba(212,255,58,.15)',
  navBg: 'rgba(22,23,24,.78)',
  band: 'rgba(32,34,36,.7)',
  meshPanel: '#101112',
  // footer only
  meshBlue: '#3B6BFF',
  meshTeal: '#19C3B1',
  meshViolet: '#7A5CFF',
  wordmarkMid: '#7FE3C0',
  wordmarkEnd: '#6B93FF',
} as const;

export const landingRadii = {
  pill: 99,
  card: 28,
  cardLarge: 48,
  control: 14,
  mesh: 32,
  bar: 8,
} as const;

export const landingFonts = {
  display700: 'BricolageGrotesque_700Bold',
  display800: 'BricolageGrotesque_800ExtraBold',
  body400: 'Figtree_400Regular',
  body500: 'Figtree_500Medium',
  body600: 'Figtree_600SemiBold',
} as const;

// Sizes are { min, vw, max }: clamp(min, vw% of viewport width, max), resolved with fluid().
export const landingType = {
  heroH1: { min: 54, vw: 8.6, max: 118 },
  sectionH2: { min: 40, vw: 7, max: 92 },
  ideaH2: { min: 36, vw: 6, max: 80 },
  faqH2: { min: 40, vw: 6, max: 76 },
  ctaH2: { min: 48, vw: 9, max: 120 },
  streak: { min: 190, vw: 34, max: 380 },
  wordmark: { min: 120, vw: 32, max: 400 },
  marquee: { min: 26, vw: 4, max: 44 },
  cardTitle: 26,
  body: 16,
  bodyLarge: 18,
  button: 16,
  eyebrow: 14,
} as const;

export const landingSpacing = {
  maxWidth: 1120,
  gutter: { min: 16, vw: 4, max: 40 },
  sectionY: { min: 72, vw: 10, max: 120 },
  cardGap: 16,
  cardPadding: 28,
  minTap: 44,
  mobileBreakpoint: 780,
} as const;

/** clamp(min, vwFactor% of viewport width, max). Pass a live `width` (useWindowDimensions) to stay reactive. */
export function fluid(
  min: number,
  vwFactor: number,
  max: number,
  width: number = Dimensions.get('window').width,
): number {
  return Math.min(max, Math.max(min, (width * vwFactor) / 100));
}
