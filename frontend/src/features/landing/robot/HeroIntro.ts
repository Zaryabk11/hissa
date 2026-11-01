import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import { useReducedMotion } from '../hooks/useReducedMotion';
import type { SceneEvents } from './types';

/** What the hero reads to reveal itself. On native, with reduced motion, or after a fallback it is all "shown". */
export type HeroIntro = {
  /** How many headline words have been punched into view (0 to 3). */
  words: SharedValue<number>;
  /** 1 once the subtext and buttons should be visible. */
  done: SharedValue<number>;
  shakeX: SharedValue<number>;
  shakeY: SharedValue<number>;
  /** False until the scene has rendered; the hero stage shows its shimmer until then. */
  ready: boolean;
};

export const HeroIntroContext = createContext<HeroIntro | null>(null);

export function useHeroIntro(): HeroIntro {
  const intro = useContext(HeroIntroContext);
  if (!intro) throw new Error('useHeroIntro must be used inside the landing page');
  return intro;
}

const SAFETY_MS = 6000;

/**
 * Owns the intro state. The intro only runs on web with motion allowed; otherwise everything starts shown.
 * `fail` (WebGL could not start) and a 6s timeout before the scene is ready both reveal the full hero.
 */
export function useHeroIntroState() {
  const reduced = useReducedMotion();
  const pending = Platform.OS === 'web' && !reduced;
  const words = useSharedValue(pending ? 0 : 3);
  const done = useSharedValue(pending ? 0 : 1);
  const shakeX = useSharedValue(0);
  const shakeY = useSharedValue(0);
  const [ready, setReady] = useState(!pending);
  const sceneReady = useRef(false);

  const showAll = useCallback(() => {
    words.set(3);
    done.set(1);
    setReady(true);
  }, [words, done]);

  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => {
      if (!sceneReady.current) showAll();
    }, SAFETY_MS);
    return () => clearTimeout(timer);
  }, [pending, showAll]);

  const events: SceneEvents = useMemo(
    () => ({
      onReady: () => {
        sceneReady.current = true;
        setReady(true);
      },
      onPunch: (k) => words.set(k + 1),
      onIntroEnd: () => done.set(1),
      onShake: (x, y) => {
        shakeX.set(x);
        shakeY.set(y);
      },
    }),
    [words, done, shakeX, shakeY],
  );

  const value: HeroIntro = useMemo(() => ({ words, done, shakeX, shakeY, ready }), [words, done, shakeX, shakeY, ready]);
  return { value, events, fail: showAll, enabled: pending };
}
