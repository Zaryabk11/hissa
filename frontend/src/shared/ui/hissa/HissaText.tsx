import { Text, type TextProps, type TextStyle } from 'react-native';
import { hissaFonts } from '../../theme/hissaTokens';
import { useHissaTheme } from '../../theme/HissaThemeProvider';

const variants: Record<string, TextStyle> = {
  title: { fontFamily: hissaFonts.display800, fontSize: 32, lineHeight: 36, textTransform: 'uppercase', letterSpacing: -0.5 },
  eyebrow: { fontFamily: hissaFonts.body600, fontSize: 14, lineHeight: 20 },
  body: { fontFamily: hissaFonts.body400, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: hissaFonts.body600, fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: hissaFonts.body400, fontSize: 14, lineHeight: 20 },
  button: { fontFamily: hissaFonts.body700, fontSize: 16, lineHeight: 20 },
  value: { fontFamily: hissaFonts.display800, fontSize: 22, lineHeight: 28, fontVariant: ['tabular-nums'] },
  hero: { fontFamily: hissaFonts.display800, fontSize: 56, lineHeight: 58, letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
};
const mutedVariants = ['eyebrow', 'caption'];

export type TextVariant = keyof typeof variants;

export function HissaText({
  variant = 'body',
  muted = mutedVariants.includes(variant),
  style,
  ...rest
}: TextProps & { variant?: TextVariant; muted?: boolean }) {
  const t = useHissaTheme();
  return <Text {...rest} style={[variants[variant], { color: muted ? t.muted : t.ink }, style]} />;
}
