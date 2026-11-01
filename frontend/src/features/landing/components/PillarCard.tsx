import { Text, View } from 'react-native';
import { landingColors, landingFonts, landingRadii } from '../../../shared/theme/landingTokens';

export function PillarCard({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <View
      style={{
        flexGrow: 1,
        padding: 28,
        borderRadius: landingRadii.card,
        backgroundColor: landingColors.surface,
        borderWidth: 1,
        borderColor: landingColors.line,
      }}
    >
      <Text style={{ fontFamily: landingFonts.body600, fontSize: 14, color: landingColors.lime }}>{n}</Text>
      <Text
        style={{
          marginTop: 56,
          fontFamily: landingFonts.display700,
          fontSize: 26,
          lineHeight: 26 * 1.15,
          letterSpacing: -0.52,
          color: landingColors.text,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          marginTop: 12,
          fontFamily: landingFonts.body400,
          fontSize: 16,
          lineHeight: 16 * 1.55,
          color: landingColors.textMuted,
        }}
      >
        {body}
      </Text>
    </View>
  );
}
