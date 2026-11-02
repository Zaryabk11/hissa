import type { SceneEvents } from './types';

export type RobotLayerProps = {
  events: SceneEvents;
  onFail: () => void;
  /** Page scroll offset and the furthest it can scroll, read every frame. */
  getScroll: () => { y: number; max: number };
};

/** Native: no 3D robot. The hero renders fully without it (see RobotLayer.web.tsx). */
export function RobotLayer(_props: RobotLayerProps) {
  return null;
}
