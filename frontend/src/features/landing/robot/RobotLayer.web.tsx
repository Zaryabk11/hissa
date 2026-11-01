import { useEffect, useRef } from 'react';
import { heroPlacement } from './placement';
import { createRobotScene } from './RobotScene';
import type { RobotLayerProps } from './RobotLayer';

/** Web: one fixed, transparent, click-through canvas over the page, created once and fully disposed on unmount. */
export function RobotLayer({ events, onFail }: RobotLayerProps) {
  // Latest callbacks without recreating the scene when the parent re-renders.
  const latest = useRef({ events, onFail });
  useEffect(() => {
    latest.current = { events, onFail };
  });

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:15';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
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
        heroPlacement,
      );
    } catch {
      canvas.remove();
      latest.current.onFail();
      return;
    }
    return () => {
      scene.dispose();
      canvas.remove();
    };
  }, []);

  return null;
}
