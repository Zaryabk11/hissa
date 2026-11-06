import { useEffect } from 'react';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { useReducedMotion } from '../../../features/landing/hooks/useReducedMotion';
import { useHissaTheme } from '../../theme/HissaThemeProvider';

export const DABBU_MOODS = ['idle', 'wave', 'happy', 'cheer', 'hungry', 'think', 'curious', 'wow', 'oops', 'sleepy', 'content', 'lonely'] as const;
export type DabbuMood = (typeof DABBU_MOODS)[number];

type Symbol = 'bowl' | 'check' | 'dots' | 'question' | 'sparkle' | 'dash' | 'moon' | 'plus';
// Ring fill is a fraction of the four plate quarters. Motion: peak translateY/translateX (px), rotate (deg), extra scale, and half-cycle ms.
const MOODS: Record<DabbuMood, { sym: Symbol; fill: number; ty?: number; tx?: number; rot?: number; sc?: number; ms: number; extra?: boolean }> = {
  idle: { sym: 'bowl', fill: 0.5, ty: -3, ms: 1400 },
  wave: { sym: 'bowl', fill: 0.75, rot: 7, ms: 400 },
  happy: { sym: 'check', fill: 0.85, ty: -6, ms: 450 },
  cheer: { sym: 'check', fill: 1, ty: -12, ms: 380, extra: true },
  hungry: { sym: 'bowl', fill: 0.1, tx: 1.5, ms: 70 },
  think: { sym: 'dots', fill: 1 / 3, rot: 4, ms: 900 },
  curious: { sym: 'question', fill: 0.5, rot: 10, ms: 800 },
  wow: { sym: 'sparkle', fill: 0.7, ty: -8, ms: 420 },
  oops: { sym: 'dash', fill: 0.25, tx: 1, ms: 60 },
  sleepy: { sym: 'moon', fill: 0.4, sc: 0.04, ms: 2200 },
  content: { sym: 'check', fill: 1, ty: -3, sc: 0.03, ms: 1800 },
  lonely: { sym: 'plus', fill: 0.2, ty: -3, ms: 1600 },
};

const SYMBOLS: Record<Symbol, string> = {
  bowl: 'M37 47h26a13 13 0 0 1-26 0zM44 63h12',
  check: 'M40 51l7 7 13-14',
  dots: '',
  question: 'M43 45a7 7 0 1 1 10 6c-2 1.5-3 2.5-3 5M50 62h.01',
  sparkle: 'M50 38l3.5 8.5L62 50l-8.5 3.5L50 62l-3.5-8.5L38 50l8.5-3.5z',
  dash: 'M41 50h18',
  moon: 'M55 40a11 11 0 1 0 5 16 9 9 0 0 1-5-16z',
  plus: 'M50 39v22M39 50h22',
};
const SPARKLES = ['M82 14l2 5 5 2-5 2-2 5-2-5-5-2 5-2z', 'M16 78l1.5 3.5 3.5 1.5-3.5 1.5L16 88l-1.5-3.5L11 83l3.5-1.5z'];

const R = 36;
const QUARTER = (Math.PI / 2) * R;
// Quarter i spans 90deg, with a 6deg gap; start at 12 o'clock.
const arc = (i: number) => {
  const pt = (deg: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return `${(50 + R * Math.cos(a)).toFixed(2)} ${(50 + R * Math.sin(a)).toFixed(2)}`;
  };
  return `M${pt(i * 90 + 3)}A${R} ${R} 0 0 1 ${pt(i * 90 + 87)}`;
};

/** Dabbu, the portion dial: cream rim, four plate-quarter segments that fill with mood, and a centre disc with one line symbol. Change `kick` to trigger a hop. Loops are off under reduced motion. */
export function Dabbu({ mood = 'idle', tone = 'lime', size = 120, kick = 0 }: { mood?: DabbuMood; tone?: 'lime' | 'cloud'; size?: number; kick?: number }) {
  const t = useHissaTheme();
  const reduced = useReducedMotion();
  const m = MOODS[mood];
  const p = useSharedValue(0);
  const k = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      p.set(0);
      return;
    }
    p.set(withRepeat(withSequence(withTiming(1, { duration: m.ms, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: m.ms, easing: Easing.inOut(Easing.quad) })), -1));
    return () => cancelAnimation(p);
  }, [m.ms, p, reduced]);

  useEffect(() => {
    if (kick && !reduced) k.set(withSequence(withTiming(-16, { duration: 160, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 260, easing: Easing.bounce })));
  }, [kick, k, reduced]);

  const style = useAnimatedStyle(() => {
    const v = p.get();
    return {
      transform: [
        { translateY: (m.ty ?? 0) * v + k.get() },
        { translateX: (m.tx ?? 0) * (2 * v - 1) },
        { rotate: `${(m.rot ?? 0) * (2 * v - 1)}deg` },
        { scale: 1 + (m.sc ?? 0) * v },
      ],
    };
  });

  const disc = tone === 'cloud' ? '#E5338A' : '#0B6B3A';
  const cream = '#FFF6DD';
  return (
    <Animated.View accessible accessibilityRole="image" accessibilityLabel={`Dabbu, ${mood}`} style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx={51.5} cy={52.5} r={46} fill={t.drop} />
        <Circle cx={50} cy={50} r={46} fill={cream} stroke="#1A0A05" strokeWidth={3} />
        {[0, 1, 2, 3].map((i) => (
          <Path key={`t${i}`} d={arc(i)} fill="none" stroke="#E7DFC9" strokeWidth={8} strokeLinecap="butt" />
        ))}
        {[0, 1, 2, 3].map((i) => {
          const f = Math.min(1, Math.max(0, m.fill * 4 - i));
          return f > 0 ? <Path key={`f${i}`} d={arc(i)} fill="none" stroke="#F4B41A" strokeWidth={8} strokeDasharray={`${f * QUARTER * 0.93} ${QUARTER}`} /> : null;
        })}
        <Circle cx={50} cy={50} r={24} fill={disc} stroke="#1A0A05" strokeWidth={2.5} />
        {m.sym === 'dots' ? (
          [0, 1, 2].map((i) => <Circle key={i} cx={50 + 9 * Math.cos((i * 2 * Math.PI) / 3 - 1.2)} cy={50 + 9 * Math.sin((i * 2 * Math.PI) / 3 - 1.2)} r={3} fill={cream} fillOpacity={1 - i * 0.3} />)
        ) : m.sym === 'sparkle' ? (
          <Path d={SYMBOLS.sparkle} fill={cream} />
        ) : (
          <Path d={SYMBOLS[m.sym]} fill="none" stroke={cream} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
        )}
        {m.extra && SPARKLES.map((d) => <Path key={d} d={d} fill="#F4B41A" stroke="#1A0A05" strokeWidth={1} />)}
      </Svg>
    </Animated.View>
  );
}
