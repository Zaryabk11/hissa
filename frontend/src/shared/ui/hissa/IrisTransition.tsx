import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useReducedMotion } from '../../../features/landing/hooks/useReducedMotion';
import { Wordmark } from './Wordmark';

const COVER_MS = 340;
const REVEAL_MS = 460;

type Point = { x: number; y: number };
type Run = (action: () => void, at?: Point) => void;
const IrisContext = createContext<Run | null>(null);

/** Green wipe that opens from the tap point (cover 340ms), runs the navigation under the wordmark, then fades away (reveal 460ms). Skipped under reduced motion. */
export function IrisProvider({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [active, setActive] = useState(false);
  const [origin, setOrigin] = useState<Point>({ x: width / 2, y: height / 2 });
  const grow = useSharedValue(0);
  const alpha = useSharedValue(0);
  const d = 2 * Math.hypot(width, height);

  const run = useCallback<Run>(
    (action, at) => {
      if (reduced) return action();
      setOrigin(at ?? { x: width / 2, y: height / 2 });
      setActive(true);
      alpha.set(1);
      grow.set(0);
      const reveal = () => {
        action();
        alpha.set(withTiming(0, { duration: REVEAL_MS }, (done) => done && scheduleOnRN(setActive, false)));
      };
      grow.set(withTiming(1, { duration: COVER_MS, easing: Easing.out(Easing.cubic) }, (done) => done && scheduleOnRN(reveal)));
    },
    [alpha, grow, height, reduced, width],
  );

  const disc = useAnimatedStyle(() => ({ transform: [{ scale: grow.get() }] }));
  const fade = useAnimatedStyle(() => ({ opacity: alpha.get() }));
  return (
    <IrisContext.Provider value={run}>
      {children}
      {active && (
        <Animated.View pointerEvents="auto" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, fade]}>
          <Animated.View style={[{ position: 'absolute', left: origin.x - d / 2, top: origin.y - d / 2, width: d, height: d, borderRadius: d / 2, backgroundColor: '#0B6B3A' }, disc]} />
          <Wordmark size={72} />
        </Animated.View>
      )}
    </IrisContext.Provider>
  );
}

/** router.push/replace wrapped in the iris wipe when an IrisProvider is mounted; plain router calls otherwise. Back is untouched. */
export function useIrisNavigate() {
  const router = useRouter();
  const run = useContext(IrisContext);
  return useMemo(() => {
    const via = (action: () => void, at?: Point) => (run ? run(action, at) : action());
    return {
      push: (href: Href, at?: Point) => via(() => router.push(href), at),
      replace: (href: Href, at?: Point) => via(() => router.replace(href), at),
    };
  }, [router, run]);
}
