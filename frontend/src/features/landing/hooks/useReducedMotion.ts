import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

const QUERY = '(prefers-reduced-motion: reduce)';
const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

/** True when the user asked the OS or browser for less motion. Every landing animation shows its final state then. */
export function useReducedMotion() {
  // Web reads the query synchronously so the first frame is already right; native resolves async.
  const [reduced, setReduced] = useState(() => isWeb && window.matchMedia(QUERY).matches);
  useEffect(() => {
    if (isWeb) {
      const mq = window.matchMedia(QUERY);
      const on = (e: MediaQueryListEvent) => setReduced(e.matches);
      mq.addEventListener('change', on);
      return () => mq.removeEventListener('change', on);
    }
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}
