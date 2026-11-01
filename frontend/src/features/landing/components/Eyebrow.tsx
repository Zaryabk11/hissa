import { Text } from 'react-native';
import { landingColors, landingFonts, landingType } from '../../../shared/theme/landingTokens';

export function Eyebrow({ children }: { children: string }) {
  return (
    <Text
      style={{
        fontFamily: landingFonts.body600,
        fontSize: landingType.eyebrow,
        letterSpacing: landingType.eyebrow * 0.14,
        textTransform: 'uppercase',
        color: landingColors.lime,
      }}
    >
      {children}
    </Text>
  );
}
