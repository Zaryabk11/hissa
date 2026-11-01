import { Text, View } from 'react-native';
import { fluid, landingColors, landingFonts, landingType } from '../../../shared/theme/landingTokens';
import { content } from '../content';
import { useLandingLayout } from '../hooks/useLandingLayout';

/** Static row of dish words; overflow is clipped. The scroll comes in phase (c). */
export function Marquee() {
  const { width } = useLandingLayout();
  const fs = fluid(landingType.marquee.min, landingType.marquee.vw, landingType.marquee.max, width);
  const text = { fontFamily: landingFonts.display800, fontSize: fs, lineHeight: fs } as const;
  return (
    <View
      accessible
      accessibilityLabel={content.marquee.join(', ')}
      style={{ backgroundColor: landingColors.lime, overflow: 'hidden' }}
    >
      <View style={{ flexDirection: 'row', paddingVertical: 16, alignSelf: 'flex-start' }}>
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
    </View>
  );
}
