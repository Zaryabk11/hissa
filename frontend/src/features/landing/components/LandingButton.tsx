import { landingColors, landingSpacing } from '../../../shared/theme/landingTokens';
import { InkButton } from './InkButton';

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
// bg/fg at rest, fill/fgHover while the ink spreads. Ink is the page's near-black, light is the off-white text colour.
const look: Record<Variant, { bg: string; fg: string; border?: string; borderWidth?: number; fill: string; fgHover: string }> = {
  lime: { bg: c.lime, fg: c.inkOnLime, fill: c.inkOnLime, fgHover: c.lime },
  outline: { bg: 'transparent', fg: c.text, border: c.lineOutline, borderWidth: 1, fill: c.lime, fgHover: c.inkOnLime },
  limeOutline: { bg: 'transparent', fg: c.lime, border: c.lime, borderWidth: 1, fill: c.lime, fgHover: c.inkOnLime },
  ink: { bg: c.inkOnLime, fg: c.lime, fill: c.text, fgHover: c.inkOnLime },
  inkOutline: { bg: 'transparent', fg: c.inkOnLime, border: c.inkOnLime, borderWidth: 2, fill: c.inkOnLime, fgHover: c.lime },
};
const height = { nav: landingSpacing.minTap, lg: 56, xl: 60 };

export function LandingButton({ label, onPress, variant = 'lime', size = 'lg', accessibilityLabel }: Props) {
  const v = look[variant];
  const filled = variant === 'lime' || variant === 'ink';
  return (
    <InkButton
      label={label}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      height={height[size]}
      paddingHorizontal={size === 'nav' ? 20 : filled ? 30 : 28}
      fontSize={size === 'xl' ? 17 : 16}
      bg={v.bg}
      fg={v.fg}
      border={v.border ? { color: v.border, width: v.borderWidth ?? 1 } : undefined}
      fill={v.fill}
      fgHover={v.fgHover}
    />
  );
}
