import { Pressable, Text } from 'react-native';
import { landingColors, landingFonts, landingRadii, landingSpacing } from '../../../shared/theme/landingTokens';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'lime' | 'outline';
  /** nav: 44 high. lg: 56 high. */
  size?: 'nav' | 'lg';
  accessibilityLabel?: string;
};

// Plain Pressable for now; the ink-spread hover replaces it in phase (c).
export function LandingButton({ label, onPress, variant = 'lime', size = 'lg', accessibilityLabel }: Props) {
  const lime = variant === 'lime';
  const nav = size === 'nav';
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => ({
        height: nav ? landingSpacing.minTap : 56,
        paddingHorizontal: nav ? 20 : lime ? 30 : 28,
        borderRadius: landingRadii.pill,
        justifyContent: 'center',
        backgroundColor: lime ? landingColors.lime : 'transparent',
        borderWidth: lime ? 0 : 1,
        borderColor: landingColors.lineOutline,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Text
        style={{
          fontFamily: landingFonts.body600,
          fontSize: 16,
          color: lime ? landingColors.inkOnLime : landingColors.text,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
