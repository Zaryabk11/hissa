import { Text, View, type LayoutChangeEvent } from 'react-native';
import { fluid, landingColors, landingFonts, landingType } from '../../../shared/theme/landingTokens';
import { Eyebrow } from '../components/Eyebrow';
import { LandingButton } from '../components/LandingButton';
import { Section } from '../components/Section';
import { SectionTitle } from '../components/SectionTitle';
import { content, type SectionId } from '../content';
import { useLandingLayout } from '../hooks/useLandingLayout';
import { BUDDY_ANCHOR_ID } from '../robot/types';

const c = content.buddy;

function StreakDots() {
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {Array.from({ length: c.dots.total }, (_, i) => (
        <View
          key={i}
          style={[
            { width: 22, height: 22, borderRadius: 99 },
            i < c.dots.filled
              ? { backgroundColor: landingColors.lime }
              : { borderWidth: 1.5, borderStyle: 'dashed', borderColor: landingColors.barGrey },
          ]}
        />
      ))}
    </View>
  );
}

export function Buddy({ onLayout, onNavigate }: { onLayout: (e: LayoutChangeEvent) => void; onNavigate: (id: SectionId) => void }) {
  const { width } = useLandingLayout();
  const streak = fluid(landingType.streak.min, landingType.streak.vw, landingType.streak.max, width);
  return (
    <Section band nativeID="sec-buddy" onLayout={onLayout} paddingY={fluid(72, 10, 120, width)} style={{ paddingBottom: fluid(48, 6, 80, width), overflow: 'hidden' }}>
      <Eyebrow>{c.eyebrow}</Eyebrow>
      <SectionTitle size={landingType.sectionH2} maxEm={10} marginTop={16}>
        {c.title}
      </SectionTitle>
      <Text
        style={{
          marginTop: 24,
          maxWidth: 18 * 30,
          fontFamily: landingFonts.body400,
          fontSize: landingType.bodyLarge,
          lineHeight: landingType.bodyLarge * 1.55,
          color: landingColors.textMuted,
        }}
      >
        {c.body}
      </Text>
      <View
        nativeID={BUDDY_ANCHOR_ID}
        accessible
        accessibilityLabel={c.label}
        style={{ height: fluid(360, 46, 470, width), marginTop: 24, alignItems: 'center' }}
      >
        <Text
          style={{
            marginTop: 4,
            fontFamily: landingFonts.display800,
            fontSize: streak,
            lineHeight: streak * 0.82,
            letterSpacing: streak * -0.06,
            color: landingColors.lime,
          }}
        >
          {c.streak}
        </Text>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', gap: 12 }}>
          <Text style={{ fontFamily: landingFonts.body500, fontSize: 16, color: landingColors.text }}>{c.days}</Text>
          <StreakDots />
        </View>
      </View>
      <View style={{ marginTop: 24, alignSelf: 'flex-start' }}>
        <LandingButton variant="limeOutline" label={c.cta} onPress={() => onNavigate('join')} />
      </View>
    </Section>
  );
}
