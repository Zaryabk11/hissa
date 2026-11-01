import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';
import { fluid, landingColors } from '../../../shared/theme/landingTokens';
import { useLandingLayout } from '../hooks/useLandingLayout';
import { useReducedMotion } from '../hooks/useReducedMotion';

const ring = (d: number, inset: number, color: string) => ({
  position: 'absolute' as const,
  top: -d * inset,
  left: -d * inset,
  right: -d * inset,
  bottom: -d * inset,
  borderRadius: 99,
  borderWidth: 1,
  borderColor: color,
});

const pulse = (to: number) => ({
  '0%': { transform: [{ scale: 1 }] },
  '50%': { transform: [{ scale: to }] },
  '100%': { transform: [{ scale: 1 }] },
});
const discPulse = pulse(1.03);
const ring1Pulse = pulse(1.05);
const ring2Pulse = pulse(1.08);

const loop = { animationDuration: '4s', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite' } as const;

/** Grey disc with a light sweep, covering the stage until it has measured, then fading out. */
function Skeleton({ d, ready }: { d: number; ready: boolean }) {
  const sweep = useMemo(
    () => ({ from: { transform: [{ translateX: -d }] }, to: { transform: [{ translateX: d }] } }),
    [d],
  );
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { alignItems: 'center', justifyContent: 'center', opacity: ready ? 0 : 1 },
        { transitionProperty: 'opacity', transitionDuration: '300ms' },
      ]}
    >
      <View style={{ width: d, height: d, borderRadius: 99, overflow: 'hidden', backgroundColor: landingColors.surface }}>
        <Animated.View
          style={[
            { width: d, height: d },
            !ready && { animationName: sweep, animationDuration: '1.4s', animationTimingFunction: 'linear', animationIterationCount: 'infinite' },
          ]}
        >
          <LinearGradient
            colors={['transparent', landingColors.surface2, 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

/** Lime disc with two halo rings, centred in its box. Pulses gently; static when motion is reduced. */
export function HeroStage({ columnWidth, ready }: { columnWidth: number; ready: boolean }) {
  const { width } = useLandingLayout();
  const reduced = useReducedMotion();
  const d = Math.min(columnWidth * 0.88, 440);
  return (
    <View
      style={{ minHeight: fluid(340, 44, 500, width), alignItems: 'center', justifyContent: 'center' }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={{ transform: [{ translateY: -d * 0.02 }] }}>
        <Animated.View
          style={[{ width: d, height: d, borderRadius: 99, backgroundColor: landingColors.lime }, !reduced && { animationName: discPulse, ...loop }]}
        >
          <Animated.View style={[ring(d, 0.05, landingColors.limeAlpha35), !reduced && { animationName: ring1Pulse, animationDelay: '0.3s', ...loop }]} />
          <Animated.View style={[ring(d, 0.11, landingColors.limeAlpha15), !reduced && { animationName: ring2Pulse, animationDelay: '0.6s', ...loop }]} />
        </Animated.View>
      </View>
      {!reduced && <Skeleton d={d} ready={ready} />}
    </View>
  );
}
