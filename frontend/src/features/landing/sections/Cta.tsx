import { Text, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import { fluid, landingColors, landingFonts } from '../../../shared/theme/landingTokens';
import { LandingButton } from '../components/LandingButton';
import { content, type SectionId } from '../content';
import { openGetHissa } from '../getHissa';
import { useLandingLayout } from '../hooks/useLandingLayout';

const c = content.cta;

const ring = (style: ViewStyle): ViewStyle => ({
  position: 'absolute',
  aspectRatio: 1,
  borderRadius: 99,
  borderWidth: 2,
  borderColor: landingColors.inkRing,
  ...style,
});

export function Cta({ onLayout, onNavigate }: { onLayout: (e: LayoutChangeEvent) => void; onNavigate: (id: SectionId) => void }) {
  const { width, gutter } = useLandingLayout();
  const h2 = fluid(48, 9, 120, width);
  const body = fluid(17, 2, 22, width);
  return (
    <View onLayout={onLayout} style={{ paddingHorizontal: gutter }}>
      <View
        style={{
          width: '100%',
          maxWidth: 1120,
          alignSelf: 'center',
          overflow: 'hidden',
          borderRadius: fluid(28, 4, 48, width),
          backgroundColor: landingColors.lime,
          paddingVertical: fluid(40, 8, 104, width),
          paddingHorizontal: fluid(24, 6, 72, width),
        }}
      >
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={ring({ right: '-6%', bottom: '-30%', width: '60%', maxWidth: 520 })}
        />
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={ring({ right: '2%', bottom: '-18%', width: '40%', maxWidth: 340 })}
        />
        <Text
          accessibilityRole="header"
          style={{
            maxWidth: h2 * 8,
            fontFamily: landingFonts.display800,
            fontSize: h2,
            lineHeight: h2 * 0.92,
            letterSpacing: h2 * -0.045,
            textTransform: 'uppercase',
            color: landingColors.inkOnLime,
          }}
        >
          {c.title}
        </Text>
        <Text
          style={{
            marginTop: 24,
            maxWidth: body * 26,
            fontFamily: landingFonts.body500,
            fontSize: body,
            lineHeight: body * 1.45,
            color: landingColors.inkOnLime,
          }}
        >
          {c.body}
        </Text>
        <View style={{ marginTop: 36, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <LandingButton size="xl" variant="ink" label={c.primary} onPress={openGetHissa} />
          <LandingButton size="xl" variant="inkOutline" label={c.secondary} onPress={() => onNavigate('how')} />
        </View>
      </View>
    </View>
  );
}
