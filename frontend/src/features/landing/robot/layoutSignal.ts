/** The page calls notifyLayout() when its content size changes; the journey re-measures (throttled) in response. */
const listeners = new Set<() => void>();

export const notifyLayout = () => listeners.forEach((fn) => fn());

export function onLayoutChange(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
