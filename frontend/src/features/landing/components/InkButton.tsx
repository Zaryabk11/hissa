import { useEffect, useRef, type ComponentRef } from 'react';
import { Platform, Pressable, Text, View, type GestureResponderEvent, type TextStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { landingFonts, landingRadii } from '../../../shared/theme/landingTokens';
import { useReducedMotion } from '../hooks/useReducedMotion';

type Props = {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  height: number;
  paddingHorizontal: number;
  fontSize: number;
  /** Colours at rest: background, label, border. */
  bg: string;
  fg: string;
  border?: { color: string; width: number };
  /** Colours on hover / press: the circle that grows, and the label shown on it. */
  fill: string;
  fgHover: string;
};

const isWeb = Platform.OS === 'web';
const enter = { duration: 750, easing: Easing.bezier(0.2, 0.7, 0.2, 1) };
const leave = { duration: 600, easing: Easing.bezier(0.5, 0, 0.3, 1) };

/**
 * Pill button with an ink-spread fill. The circle grows from where the pointer entered (web hover) or the
 * touch landed (native press) and shrinks toward where it left. The label is drawn twice: once at rest
 * colour underneath, once in the hover colour inside the circle, so every glyph is always on its own
 * background and stays readable mid-transition.
 */
export function InkButton({ label, onPress, accessibilityLabel, height, paddingHorizontal, fontSize, bg, fg, border, fill, fgHover }: Props) {
  const reduced = useReducedMotion();
  const bw = border?.width ?? 0; // absolute children sit in the padding box, inside the border
  const ref = useRef<ComponentRef<typeof Pressable>>(null);
  const p = useSharedValue(0); // 0 = no fill, 1 = fully covered
  const px = useSharedValue(0);
  const py = useSharedValue(0);
  const w = useSharedValue(0);
  const h = useSharedValue(0);

  const on = (x: number, y: number) => {
    px.set(x - bw);
    py.set(y - bw);
    p.set(reduced ? 1 : withTiming(1, enter));
  };
  const off = (x: number, y: number) => {
    px.set(x - bw);
    py.set(y - bw);
    p.set(reduced ? 0 : withTiming(0, leave));
  };

  // Web: DOM pointer events give the entry and exit points. Touch pointers take the press path, like native.
  useEffect(() => {
    const el = ref.current as unknown as HTMLElement | null;
    if (!isWeb || !el) return;
    const at = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top] as const;
    };
    const down = (e: PointerEvent) => on(...at(e));
    const up = (e: PointerEvent) => off(...at(e));
    const hover = (fn: (e: PointerEvent) => void) => (e: PointerEvent) => e.pointerType !== 'touch' && fn(e);
    const touch = (fn: (e: PointerEvent) => void) => (e: PointerEvent) => e.pointerType === 'touch' && fn(e);
    const handlers: [string, (e: PointerEvent) => void][] = [
      ['pointerenter', hover(down)],
      ['pointerleave', hover(up)],
      ['pointerdown', touch(down)],
      ['pointerup', touch(up)],
      ['pointercancel', touch(up)],
    ];
    handlers.forEach(([t, fn]) => el.addEventListener(t, fn as EventListener));
    return () => handlers.forEach(([t, fn]) => el.removeEventListener(t, fn as EventListener));
    // on/off only close over shared values and `reduced`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  // Native: no hover, so the press point is the entry point. Children ignore touches so locationX is button-relative.
  const pressIn = (e: GestureResponderEvent) => on(e.nativeEvent.locationX, e.nativeEvent.locationY);
  const pressOut = (e: GestureResponderEvent) => off(e.nativeEvent.locationX, e.nativeEvent.locationY);

  const circle = useAnimatedStyle(() => {
    const r = p.value * Math.hypot(w.value, h.value);
    return { width: 2 * r, height: 2 * r, borderRadius: r, left: px.value - r, top: py.value - r };
  });
  // Same box as the button, counter-offset so the hover label sits exactly over the resting one.
  const overlay = useAnimatedStyle(() => {
    const r = p.value * Math.hypot(w.value, h.value);
    return { width: w.value - 2 * bw, height: h.value - 2 * bw, left: r - px.value, top: r - py.value };
  });

  const text: TextStyle = { fontFamily: landingFonts.body600, fontSize };
  return (
    <Pressable
      ref={ref}
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      onPressIn={isWeb ? undefined : pressIn}
      onPressOut={isWeb ? undefined : pressOut}
      onLayout={(e) => {
        w.set(e.nativeEvent.layout.width);
        h.set(e.nativeEvent.layout.height);
      }}
      style={{
        height,
        paddingHorizontal,
        borderRadius: landingRadii.pill,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        backgroundColor: bg,
        borderWidth: bw,
        borderColor: border?.color,
      }}
    >
      <View pointerEvents="none">
        <Text style={[text, { color: fg }]}>{label}</Text>
      </View>
      <Animated.View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[{ position: 'absolute', overflow: 'hidden', backgroundColor: fill }, circle]}
      >
        <Animated.View
          style={[{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }, overlay]}
        >
          <Text style={[text, { color: fgHover }]}>{label}</Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}
