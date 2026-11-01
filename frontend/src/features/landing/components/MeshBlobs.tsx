import { useEffect, useId, useRef, type ComponentRef, type RefObject } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { landingColors } from '../../../shared/theme/landingTokens';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { hasFinePointer } from './CursorRing';

type Frame = [x: number, y: number, scale: number];
const at = ([x, y, s]: Frame) => ({
  transform: [{ translateX: `${x}%` as const }, { translateY: `${y}%` as const }, { scale: s }],
});
const drift = (a: Frame, b: Frame) => ({ '0%': at(a), '50%': at(b), '100%': at(a) });

// Size (share of panel width), anchor, opacity and drift taken from the landing HTML (hm1, hm2, hm3).
const blobs = [
  { color: landingColors.lime, opacity: 0.55, size: 0.45, pos: { left: '-5%', bottom: '-40%' }, seconds: 11, a: [-10, 0, 1], b: [40, -20, 1.3] },
  { color: landingColors.meshBlue, opacity: 0.7, size: 0.5, pos: { right: '-5%', bottom: '-40%' }, seconds: 13, a: [0, 0, 1.2], b: [-45, 10, 0.9] },
  { color: landingColors.meshTeal, opacity: 0.5, size: 0.4, pos: { left: '30%', bottom: '-50%' }, seconds: 9, a: [0, 10, 1], b: [30, -30, 1.25] },
] as const;
const BLUR = 90;
const POINTER = { size: 260, blur: 70, opacity: 0.5, ease: 0.12 };

/**
 * A soft disc standing in for `filter: blur(sigma)` on a solid circle of diameter d: a radial gradient that is
 * flat inside, half strength at the old edge and gone two sigmas past it. Small discs get a lower peak, as a
 * real blur would give. The SVG is larger than the box so the falloff is not clipped.
 */
function Soft({ color, d, sigma }: { color: string; d: number; sigma: number }) {
  const id = useId().replace(/\W/g, '');
  const r = d / 2;
  const R = r + 2 * sigma;
  const peak = 1 - Math.exp(-(r * r) / (2 * sigma * sigma));
  const stops: [number, number][] = [
    [Math.max(0, (r - sigma) / R), 1],
    [r / R, 0.5],
    [(r + sigma) / R, 0.16],
    [1, 0],
  ];
  return (
    <Svg width={2 * R} height={2 * R} style={{ position: 'absolute', left: r - R, top: r - R }}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          {stops.map(([offset, a]) => (
            <Stop key={offset} offset={offset} stopColor={color} stopOpacity={a * peak} />
          ))}
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

function Drifter({ b, w, reduced }: { b: (typeof blobs)[number]; w: number; reduced: boolean }) {
  const d = w * b.size;
  const frames = drift(b.a as unknown as Frame, b.b as unknown as Frame);
  return (
    <Animated.View
      style={[
        { position: 'absolute', width: d, height: d, opacity: b.opacity, ...b.pos },
        // Reduced motion rests on the first keyframe. Drift is transform only, so it never repaints.
        reduced
          ? frames['0%']
          : { animationName: frames, animationDuration: `${b.seconds}s`, animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite' },
      ]}
    >
      <Soft color={b.color} d={d} sigma={BLUR} />
    </Animated.View>
  );
}

/** Violet blob that eases toward the pointer while it is over the panel's rows. Web with a fine pointer only. */
function PointerBlob({ w, h, panel, follow }: { w: number; h: number; panel: RefObject<ComponentRef<typeof View> | null>; follow: boolean }) {
  const half = POINTER.size / 2;
  const x = useSharedValue(w / 2);
  const y = useSharedValue(h * 0.6);
  const tx = useSharedValue(w / 2);
  const ty = useSharedValue(h * 0.6);
  const moved = useRef(false);

  // Until the pointer has been over the panel, the blob rests at its HTML start (50%, 60%) and tracks resizes.
  useEffect(() => {
    if (moved.current) return;
    tx.set(w / 2);
    ty.set(h * 0.6);
    x.set(w / 2);
    y.set(h * 0.6);
  }, [w, h, tx, ty, x, y]);

  useEffect(() => {
    const el = panel.current as unknown as HTMLElement | null;
    if (!follow || !el) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      if (e.clientY < r.top || e.clientY > r.bottom) return;
      moved.current = true;
      // The centre stays inside the panel.
      tx.set(Math.min(r.width, Math.max(0, e.clientX - r.left)));
      ty.set(Math.min(r.height, Math.max(0, e.clientY - r.top)));
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, [follow, panel, tx, ty]);

  useFrameCallback(() => {
    if (!follow) return;
    const dx = tx.value - x.value;
    const dy = ty.value - y.value;
    if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) return;
    x.set(x.get() + dx * POINTER.ease);
    y.set(y.get() + dy * POINTER.ease);
  });

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value - half }, { translateY: y.value - half }] }));
  return (
    <Animated.View
      style={[{ position: 'absolute', top: 0, left: 0, width: POINTER.size, height: POINTER.size, opacity: POINTER.opacity }, style]}
    >
      <Soft color={landingColors.meshViolet} d={POINTER.size} sigma={POINTER.blur} />
    </Animated.View>
  );
}

/** Colour blobs behind the wordmark. The panel clips them. w and h are the panel's size in px. */
export function MeshBlobs({ w, h, panel }: { w: number; h: number; panel: RefObject<ComponentRef<typeof View> | null> }) {
  const reduced = useReducedMotion();
  // The pointer blob needs a mouse; it is never mounted on native or touch screens.
  const pointer = hasFinePointer();
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {blobs.map((b) => (
        <Drifter key={b.color} b={b} w={w} reduced={reduced} />
      ))}
      {pointer && <PointerBlob w={w} h={h} panel={panel} follow={!reduced} />}
    </View>
  );
}
