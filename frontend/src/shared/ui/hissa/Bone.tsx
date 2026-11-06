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
import { useHissaTheme } from '../../theme/HissaThemeProvider';

/** A placeholder block whose hairline overlay pulses. Reanimated skips the loop under reduced motion, so it stays still. */
export function Bone({
  width,
  height,
  radius,
  border,
}: {
  width: DimensionValue;
  height: number;
  radius: number;
  border?: boolean;
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
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: t.surf,
        borderWidth: border ? 2 : 0,
        borderColor: t.line,
        overflow: 'hidden',
      }}
    >
      <Animated.View style={[{ flex: 1, backgroundColor: t.surf2 }, style]} />
    </View>
  );
}
