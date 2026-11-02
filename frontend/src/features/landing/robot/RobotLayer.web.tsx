import { useEffect, useRef } from 'react';
import { createJourney } from './journey';
import { createRobotScene } from './RobotScene';
import type { RobotLayerProps } from './RobotLayer';

/** Web: one fixed, transparent, click-through canvas over the page, created once and fully disposed on unmount. */
export function RobotLayer({ events, onFail, getScroll }: RobotLayerProps) {
  // Latest callbacks without recreating the scene when the parent re-renders.
  const latest = useRef({ events, onFail, getScroll });
  useEffect(() => {
    latest.current = { events, onFail, getScroll };
  });

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:15';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    const journey = createJourney(() => latest.current.getScroll());
    let scene: ReturnType<typeof createRobotScene>;
    try {
      scene = createRobotScene(
        canvas,
        {
          onReady: () => latest.current.events.onReady(),
          onPunch: (k) => latest.current.events.onPunch(k),
          onIntroEnd: () => latest.current.events.onIntroEnd(),
          onShake: (x, y) => latest.current.events.onShake(x, y),
        },
        journey.getFrame,
      );
    } catch {
      journey.dispose();
      canvas.remove();
      latest.current.onFail();
      return;
    }
    return () => {
      scene.dispose();
      journey.dispose();
      canvas.remove();
    };
  }, []);

  return null;
}
