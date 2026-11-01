import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { landingColors, landingFonts, landingRadii } from '../../../shared/theme/landingTokens';

type Props = { n: string; title: string; body: string; visual: ReactNode };

export function StepCard({ n, title, body, visual }: Props) {
  return (
    <View
      style={{
        flexGrow: 1,
        overflow: 'hidden',
        borderRadius: landingRadii.card,
        backgroundColor: landingColors.bg,
        borderWidth: 1,
        borderColor: landingColors.line,
      }}
    >
      <View style={{ height: 230, overflow: 'hidden' }}>{visual}</View>
      <View style={{ paddingTop: 24, paddingHorizontal: 26, paddingBottom: 30 }}>
        <Text style={{ fontFamily: landingFonts.body600, fontSize: 14, color: landingColors.lime }}>{n}</Text>
        <Text
          style={{
            marginTop: 8,
            fontFamily: landingFonts.display700,
            fontSize: 25,
            lineHeight: 25 * 1.15,
            color: landingColors.text,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            marginTop: 8,
            fontFamily: landingFonts.body400,
            fontSize: 16,
            lineHeight: 16 * 1.55,
            color: landingColors.textMuted,
          }}
        >
          {body}
        </Text>
      </View>
    </View>
  );
}
