import { useState } from 'react';
import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import { fluid, landingColors, landingFonts, landingType } from '../../../shared/theme/landingTokens';
import { Grid } from '../components/Grid';
import { Section } from '../components/Section';
import { SectionTitle } from '../components/SectionTitle';
import { content } from '../content';
import { useLandingLayout } from '../hooks/useLandingLayout';

const c = content.faq;

export function Faq({ onLayout }: { onLayout: (e: LayoutChangeEvent) => void }) {
  const { width } = useLandingLayout();
  const [open, setOpen] = useState(-1);
  return (
    <Section onLayout={onLayout} paddingY={fluid(72, 10, 120, width)}>
      <Grid minCol={320} gap={fluid(32, 6, 72, width)}>
        <SectionTitle size={landingType.faqH2}>{c.title}</SectionTitle>
        <View style={{ borderTopWidth: 1, borderColor: landingColors.line }}>
          {c.items.map((f, i) => {
            const expanded = open === i;
            return (
              <View key={f.q} style={{ borderBottomWidth: 1, borderColor: landingColors.line }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  onPress={() => setOpen(expanded ? -1 : i)}
                  style={{ minHeight: 72, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}
                >
                  <Text style={{ flex: 1, fontFamily: landingFonts.body600, fontSize: 20, lineHeight: 26, color: landingColors.text }}>
                    {f.q}
                  </Text>
                  <View
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 99,
                      borderWidth: 1,
                      borderColor: landingColors.lineStrong,
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: [{ rotate: expanded ? '45deg' : '0deg' }],
                    }}
                  >
                    <Text style={{ fontFamily: landingFonts.body400, fontSize: 22, lineHeight: 26, color: landingColors.lime }}>+</Text>
                  </View>
                </Pressable>
                {expanded && (
                  <Text
                    style={{
                      paddingBottom: 24,
                      maxWidth: 16 * 36,
                      fontFamily: landingFonts.body400,
                      fontSize: 16,
                      lineHeight: 16 * 1.6,
                      color: landingColors.textMuted,
                    }}
                  >
                    {f.a}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </Grid>
    </Section>
  );
}
