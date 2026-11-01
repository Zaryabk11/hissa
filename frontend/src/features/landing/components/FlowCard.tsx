import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  measure,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useReducedMotion } from '../hooks/useReducedMotion';

/** The page's scroll offset, provided by LandingPage. Cards watch it to know when they come into view. */
export const ScrollYContext = createContext<SharedValue<number> | null>(null);

const SHOW = { duration: 900, easing: Easing.bezier(0.2, 0.8, 0.2, 1) };
const FAILSAFE_MS = 2500;

/**
 * Arcs a card in from the bottom-left or bottom-right the first time it scrolls into view.
 * Runs once. If it cannot measure itself (or motion is reduced) the card still appears.
 */
export function FlowCard({ side, children }: { side: 'left' | 'right'; children: ReactNode }) {
  const scrollY = useContext(ScrollYContext);
  const reduced = useReducedMotion();
  const { height: winH } = useWindowDimensions();
  const ref = useAnimatedRef<Animated.View>();
  const p = useSharedValue(reduced ? 1 : 0);
  const dir = side === 'left' ? -1 : 1;

  const measured = useSharedValue(false);
  const tick = useSharedValue(0); // bumped on layout so a card already in view reveals without a scroll

  // Reveal when the card's top is inside the viewport. Checked on every scroll and after each layout.
  const check = () => {
    'worklet';
    if (p.value > 0) return;
    const m = measure(ref);
    if (!m || m.height <= 0) return;
    measured.value = true;
    if (m.pageY < winH - 48) p.value = withTiming(1, SHOW);
  };
  useAnimatedReaction(() => scrollY?.value ?? 0, check);
  useAnimatedReaction(() => tick.value, check);

  // Failsafe: if the card never managed to measure itself, show it anyway rather than leave it hidden.
  useEffect(() => {
    if (reduced) {
      p.set(1);
      return;
    }
    const t = setTimeout(() => {
      if (!measured.get() && p.get() === 0) p.set(withTiming(1, SHOW));
    }, FAILSAFE_MS);
    return () => clearTimeout(t);
  }, [reduced, p, measured]);

  const style = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [
      { translateX: dir * 110 * (1 - p.value) },
      { translateY: 90 * (1 - p.value) },
      { rotate: `${dir * 8 * (1 - p.value)}deg` },
    ],
  }));

  return (
    <Animated.View ref={ref} onLayout={() => tick.set(tick.get() + 1)} style={[{ flexGrow: 1 }, style]}>
      {children}
    </Animated.View>
  );
}
