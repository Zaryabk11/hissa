import { useEffect } from 'react';
import { View, type DimensionValue } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useHissaTheme } from '../../../shared/theme/HissaThemeProvider';

/** A placeholder block whose hairline overlay pulses. Reanimated skips the loop under reduced motion. */
export function Bone({
  width,
  height,
  radius = 8,
}: {
  width: DimensionValue;
  height: number;
  radius?: number;
}) {
  const t = useHissaTheme();
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      ),
    );
  }, [pulse]);
  const style = useAnimatedStyle(() => ({ opacity: pulse.get() }));
  return (
    <View
      style={{ width, height, borderRadius: radius, backgroundColor: t.surf, overflow: 'hidden' }}
    >
      <Animated.View style={[{ flex: 1, backgroundColor: t.hair }, style]} />
    </View>
  );
}

/** Stand-in for a card while it loads. */
export function CardSkeleton({ label, lines = 3 }: { label: string; lines?: number }) {
  const t = useHissaTheme();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      style={{
        gap: 12,
        padding: 16,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: t.hair,
        backgroundColor: t.surf,
      }}
    >
      <Bone width="60%" height={22} />
      {Array.from({ length: lines }, (_, i) => (
        <Bone key={i} width="100%" height={48} radius={14} />
      ))}
    </View>
  );
}
