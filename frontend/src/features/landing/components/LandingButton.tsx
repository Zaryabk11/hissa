import { Pressable, Text } from 'react-native';
import { landingColors, landingFonts, landingRadii, landingSpacing } from '../../../shared/theme/landingTokens';

type Variant = 'lime' | 'outline' | 'limeOutline' | 'ink' | 'inkOutline';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  /** nav: 44 high. lg: 56 high. xl: 60 high, for the CTA panel. */
  size?: 'nav' | 'lg' | 'xl';
  accessibilityLabel?: string;
};

const c = landingColors;
const look: Record<Variant, { bg: string; fg: string; border?: string; borderWidth?: number }> = {
  lime: { bg: c.lime, fg: c.inkOnLime },
  outline: { bg: 'transparent', fg: c.text, border: c.lineOutline, borderWidth: 1 },
  limeOutline: { bg: 'transparent', fg: c.lime, border: c.lime, borderWidth: 1 },
  ink: { bg: c.inkOnLime, fg: c.lime },
  inkOutline: { bg: 'transparent', fg: c.inkOnLime, border: c.inkOnLime, borderWidth: 2 },
};
const height = { nav: landingSpacing.minTap, lg: 56, xl: 60 };

// Plain Pressable for now; the ink-spread hover replaces it in phase (c).
export function LandingButton({ label, onPress, variant = 'lime', size = 'lg', accessibilityLabel }: Props) {
  const v = look[variant];
  const filled = variant === 'lime' || variant === 'ink';
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => ({
        height: height[size],
        paddingHorizontal: size === 'nav' ? 20 : filled ? 30 : 28,
        borderRadius: landingRadii.pill,
        justifyContent: 'center',
        backgroundColor: v.bg,
        borderWidth: v.borderWidth ?? 0,
        borderColor: v.border,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Text style={{ fontFamily: landingFonts.body600, fontSize: size === 'xl' ? 17 : 16, color: v.fg }}>{label}</Text>
    </Pressable>
  );
}
