import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Animated, { useAnimatedStyle, useFrameCallback, useSharedValue, withTiming } from 'react-native-reanimated';
import { useReducedMotion } from '../hooks/useReducedMotion';

const SIZE = 40;
const GROW = 72 / 40;
const INTERACTIVE = 'a, button, [role="button"], [role="link"]';

function Ring() {
  const reduced = useReducedMotion();
  const mx = useSharedValue(-100);
  const my = useSharedValue(-100);
  const rx = useSharedValue(-100);
  const ry = useSharedValue(-100);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      mx.value = e.clientX;
      my.value = e.clientY;
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withTiming((e.target as Element | null)?.closest?.(INTERACTIVE) ? GROW : 1, { duration: 250 });
    };
    const gone = (e: MouseEvent) => {
      if (!e.relatedTarget) opacity.value = withTiming(0, { duration: 300 });
    };
    window.addEventListener('pointermove', move);
    document.addEventListener('mouseout', gone);
    // Native cursor is hidden only while the ring is mounted, since the ring stands in for it.
    const hide = document.createElement('style');
    hide.textContent = 'html, html * { cursor: none !important; }';
    document.head.appendChild(hide);
    return () => {
      window.removeEventListener('pointermove', move);
      document.removeEventListener('mouseout', gone);
      hide.remove();
    };
  }, [mx, my, opacity, scale]);

  // Ease toward the pointer 20% per frame; reduced motion snaps to it.
  useFrameCallback(() => {
    rx.value = reduced ? mx.value : rx.value + (mx.value - rx.value) * 0.2;
    ry.value = reduced ? my.value : ry.value + (my.value - ry.value) * 0.2;
  });

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: rx.value }, { translateY: ry.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          // position: fixed and mixBlendMode are web-only; this component never mounts on native.
          position: 'fixed' as 'absolute',
          top: 0,
          left: 0,
          width: SIZE,
          height: SIZE,
          marginTop: -SIZE / 2,
          marginLeft: -SIZE / 2,
          borderRadius: 99,
          borderWidth: 1,
          borderColor: '#fff',
          zIndex: 70,
          mixBlendMode: 'difference',
        },
        style,
      ]}
    />
  );
}

/** Web-only follower ring for fine pointers (mouse, trackpad). Renders nothing on native or touch screens. */
export function CursorRing() {
  const [fine] = useState(() => Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches);
  return fine ? <Ring /> : null;
}
