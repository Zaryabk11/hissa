import { useState } from 'react';
import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated from 'react-native-reanimated';
import { fluid, landingColors, landingFonts, landingType } from '../../../shared/theme/landingTokens';
import { Grid } from '../components/Grid';
import { Section } from '../components/Section';
import { SectionTitle } from '../components/SectionTitle';
import { content } from '../content';
import { useLandingLayout } from '../hooks/useLandingLayout';
import { useReducedMotion } from '../hooks/useReducedMotion';

const c = content.faq;
const easeTransform = { transitionProperty: 'transform', transitionDuration: '250ms', transitionTimingFunction: 'ease-out' } as const;
const easeHeight = { transitionProperty: 'height', transitionDuration: '250ms', transitionTimingFunction: 'ease-out' } as const;

function FaqItem({ q, a, expanded, onPress }: { q: string; a: string; expanded: boolean; onPress: () => void }) {
  const reduced = useReducedMotion();
  // The answer is laid out at full height off to the side of a clipped wrapper, so its height is known before it opens.
  const [h, setH] = useState(0);
  return (
    <View style={{ borderBottomWidth: 1, borderColor: landingColors.line }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={onPress}
        style={{ minHeight: 72, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}
      >
        <Text style={{ flex: 1, fontFamily: landingFonts.body600, fontSize: 20, lineHeight: 26, color: landingColors.text }}>{q}</Text>
        <Animated.View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            {
              width: 36,
              height: 36,
              borderRadius: 99,
              borderWidth: 1,
              borderColor: landingColors.lineStrong,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ rotate: expanded ? '45deg' : '0deg' }],
            },
            !reduced && easeTransform,
          ]}
        >
          <Text style={{ fontFamily: landingFonts.body400, fontSize: 22, lineHeight: 26, color: landingColors.lime }}>+</Text>
        </Animated.View>
      </Pressable>
      <Animated.View
        accessibilityElementsHidden={!expanded}
        importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
        style={[{ overflow: 'hidden', height: expanded ? h : 0 }, !reduced && easeHeight]}
      >
        <View
          onLayout={(e) => setH(e.nativeEvent.layout.height)}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingBottom: 24 }}
        >
          <Text style={{ maxWidth: 16 * 36, fontFamily: landingFonts.body400, fontSize: 16, lineHeight: 16 * 1.6, color: landingColors.textMuted }}>
            {a}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

export function Faq({ onLayout }: { onLayout: (e: LayoutChangeEvent) => void }) {
  const { width } = useLandingLayout();
  const [open, setOpen] = useState(-1);
  return (
    <Section nativeID="sec-faq" onLayout={onLayout} paddingY={fluid(72, 10, 120, width)}>
      <Grid minCol={320} gap={fluid(32, 6, 72, width)}>
        <SectionTitle size={landingType.faqH2}>{c.title}</SectionTitle>
        <View style={{ borderTopWidth: 1, borderColor: landingColors.line }}>
          {c.items.map((f, i) => (
            <FaqItem key={f.q} q={f.q} a={f.a} expanded={open === i} onPress={() => setOpen(open === i ? -1 : i)} />
          ))}
        </View>
      </Grid>
    </Section>
  );
}
