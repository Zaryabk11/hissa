import { useEffect } from 'react';
import { View, type DimensionValue } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useHissaTheme } from '../../../shared/theme/HissaThemeProvider';
import { HissaScreen } from '../../../shared/ui/hissa/HissaScreen';
import { todayContent as c } from '../content';

/** A placeholder block whose hairline overlay pulses. Reanimated skips the loop under reduced motion, so it stays still. */
function Bone({ width, height, radius, border }: { width: DimensionValue; height: number; radius: number; border?: boolean }) {
  const t = useHissaTheme();
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.set(withRepeat(withSequence(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 700, easing: Easing.inOut(Easing.quad) })), -1));
  }, [pulse]);
  const style = useAnimatedStyle(() => ({ opacity: pulse.get() }));
  return (
    <View style={{ width, height, borderRadius: radius, backgroundColor: t.surf, borderWidth: border ? 1 : 0, borderColor: t.hair, overflow: 'hidden' }}>
      <Animated.View style={[{ flex: 1, backgroundColor: t.hair }, style]} />
    </View>
  );
}

/** Today while data loads (screen o): header, ring, meal rows and the streak card as bones. */
export function TodaySkeleton() {
  const t = useHissaTheme();
  return (
    <HissaScreen>
      <View accessible accessibilityRole="progressbar" accessibilityLabel={c.loading} accessibilityState={{ busy: true }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ gap: 8 }}>
            <Bone width={90} height={12} radius={6} />
            <Bone width={180} height={22} radius={8} />
          </View>
          <Bone width={40} height={40} radius={20} />
        </View>
        <View style={{ alignItems: 'center', marginTop: 12 }}>
          <View style={{ width: 220, height: 220, borderRadius: 110, borderWidth: 10, borderColor: t.hair, alignItems: 'center', justifyContent: 'center' }}>
            <Bone width={110} height={40} radius={10} />
          </View>
        </View>
        <View style={{ marginTop: 28, gap: 8 }}>
          <Bone width={140} height={20} radius={8} />
          <Bone width="100%" height={64} radius={14} border />
          <Bone width="100%" height={64} radius={14} border />
          <View style={{ marginTop: 8 }}>
            <Bone width="100%" height={88} radius={14} border />
          </View>
        </View>
      </View>
    </HissaScreen>
  );
}
