import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { fluid, landingColors, landingFonts, landingType } from '../../../shared/theme/landingTokens';
import { content } from '../content';
import { useLandingLayout } from '../hooks/useLandingLayout';
import { useReducedMotion } from '../hooks/useReducedMotion';

/** Dish words on a lime band. The row is rendered twice and shifted by one row width, so the loop is seamless. */
export function Marquee() {
  const { width } = useLandingLayout();
  const reduced = useReducedMotion();
  const [rowW, setRowW] = useState(0);
  const fs = fluid(landingType.marquee.min, landingType.marquee.vw, landingType.marquee.max, width);
  const text = { fontFamily: landingFonts.display800, fontSize: fs, lineHeight: fs } as const;
  const slide = useMemo(() => ({ from: { transform: [{ translateX: 0 }] }, to: { transform: [{ translateX: -rowW }] } }), [rowW]);

  const row = (key: string, onLayout?: (w: number) => void) => (
    <View key={key} onLayout={onLayout && ((e) => onLayout(e.nativeEvent.layout.width))} style={{ flexDirection: 'row', flexShrink: 0 }}>
      {content.marquee.map((m, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 28, flexShrink: 0 }}>
          <Text
            numberOfLines={1}
            style={[text, { letterSpacing: fs * -0.02, textTransform: 'uppercase', color: landingColors.inkOnLime }]}
          >
            {m}
          </Text>
          <Text style={[text, { marginLeft: 56, color: landingColors.inkFaint }]}>/</Text>
        </View>
      ))}
    </View>
  );

  return (
    <View
      accessible
      accessibilityLabel={content.marquee.join(', ')}
      style={{ backgroundColor: landingColors.lime, overflow: 'hidden' }}
    >
      <Animated.View
        style={[
          { flexDirection: 'row', paddingVertical: 16, alignSelf: 'flex-start' },
          !reduced && rowW > 0 && {
            animationName: slide,
            animationDuration: '30s',
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
          },
        ]}
      >
        {row('a', setRowW)}
        {row('b')}
      </Animated.View>
    </View>
  );
}
