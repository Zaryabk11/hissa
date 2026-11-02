import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useHissaTheme } from '../../../shared/theme/HissaThemeProvider';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const CIRC = 628.3; // 2 * pi * 100

/** Ring that draws to `fraction` (0..1). Reanimated honours the system reduced-motion setting, so it then jumps to the end. */
export function BudgetRing({ fraction, label, children }: { fraction: number; label: string; children: ReactNode }) {
  const t = useHissaTheme();
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withTiming(Math.max(0, Math.min(1, fraction)), { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [fraction, progress]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: CIRC * (1 - progress.get()) }));
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={{ width: 220, height: 220, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={220} height={220} viewBox="0 0 220 220" style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={110} cy={110} r={100} fill="none" stroke={t.hair} strokeWidth={10} />
        <AnimatedCircle cx={110} cy={110} r={100} fill="none" stroke={t.tur} strokeWidth={10} strokeLinecap="round" strokeDasharray={CIRC} animatedProps={props} />
      </Svg>
      {children}
    </View>
  );
}
