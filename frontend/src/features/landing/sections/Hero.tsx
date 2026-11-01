import { useState } from 'react';
import { Text, View } from 'react-native';
import { fluid, landingColors, landingFonts, landingType } from '../../../shared/theme/landingTokens';
import { LandingButton } from '../components/LandingButton';
import { content, type SectionId } from '../content';
import { useLandingLayout } from '../hooks/useLandingLayout';

const MIN_COL = 420;

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

/** Lime disc with two halo rings, centred in its box. Static for now. */
function HeroStage({ columnWidth }: { columnWidth: number }) {
  const { width } = useLandingLayout();
  const d = Math.min(columnWidth * 0.88, 440);
  return (
    <View
      style={{ minHeight: fluid(340, 44, 500, width), alignItems: 'center', justifyContent: 'center' }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View
        style={{
          width: d,
          height: d,
          borderRadius: 99,
          backgroundColor: landingColors.lime,
          transform: [{ translateY: -d * 0.02 }],
        }}
      >
        <View style={ring(d, 0.05, landingColors.limeAlpha35)} />
        <View style={ring(d, 0.11, landingColors.limeAlpha15)} />
      </View>
    </View>
  );
}

type Props = { contentWidth: number; gutter: number; onNavigate: (id: SectionId) => void };

export function Hero({ contentWidth, gutter, onNavigate }: Props) {
  const { width } = useLandingLayout();
  const gap = fluid(24, 4, 56, width);
  const twoCol = contentWidth >= MIN_COL * 2 + gap;
  // Seed with the expected column width so the stage paints on the first frame; onLayout then corrects it.
  const [stageW, setStageW] = useState(twoCol ? (contentWidth - gap) / 2 : contentWidth);
  const h1 = fluid(landingType.heroH1.min, landingType.heroH1.vw, landingType.heroH1.max, width);
  const bodySize = fluid(17, 1.5, 19, width);
  const word = {
    fontFamily: landingFonts.display800,
    fontSize: h1,
    lineHeight: h1 * 0.9,
    letterSpacing: h1 * -0.045,
    textTransform: 'uppercase',
  } as const;

  return (
    <View
      style={{
        width: '100%',
        maxWidth: 1120 + gutter * 2,
        alignSelf: 'center',
        paddingHorizontal: gutter,
        paddingTop: fluid(32, 6, 72, width),
        paddingBottom: fluid(56, 8, 96, width),
        flexDirection: twoCol ? 'row' : 'column',
        alignItems: twoCol ? 'center' : 'stretch',
        gap,
      }}
    >
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          position: 'absolute',
          left: gutter,
          top: 20,
          fontFamily: landingFonts.body400,
          fontSize: 22,
          lineHeight: 22,
          color: '#fff',
        }}
      >
        +
      </Text>
      <View style={{ flex: twoCol ? 1 : undefined }}>
        <View
          style={{
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            height: 32,
            paddingHorizontal: 14,
            borderWidth: 1,
            borderColor: landingColors.linePill,
            borderRadius: 99,
          }}
        >
          <View style={{ width: 8, height: 8, borderRadius: 99, backgroundColor: landingColors.lime }} />
          <Text style={{ fontFamily: landingFonts.body500, fontSize: 14, color: landingColors.textMuted }}>
            {content.hero.badge}
          </Text>
        </View>
        <View accessible accessibilityRole="header" accessibilityLabel={content.hero.words.join(' ')} style={{ marginTop: 24 }}>
          {content.hero.words.map((w, i) => (
            <Text key={w} style={[word, { color: i === 2 ? landingColors.lime : landingColors.text }]}>
              {w}
            </Text>
          ))}
        </View>
        <Text
          style={{
            marginTop: 28,
            maxWidth: bodySize * 28,
            fontFamily: landingFonts.body400,
            fontSize: bodySize,
            lineHeight: bodySize * 1.55,
            color: landingColors.textMuted,
          }}
        >
          {content.hero.body}
        </Text>
        <View style={{ marginTop: 32, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <LandingButton label={content.hero.primary} onPress={() => onNavigate('join')} />
          <LandingButton variant="outline" label={content.hero.secondary} onPress={() => onNavigate('how')} />
        </View>
      </View>
      <View style={{ flex: twoCol ? 1 : undefined }} onLayout={(e) => setStageW(e.nativeEvent.layout.width)}>
        {stageW > 0 && <HeroStage columnWidth={stageW} />}
      </View>
    </View>
  );
}
