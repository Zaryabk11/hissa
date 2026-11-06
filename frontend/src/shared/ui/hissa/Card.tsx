import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { hissaRadii } from '../../theme/hissaTokens';
import { useHissaTheme } from '../../theme/HissaThemeProvider';
import { sticker } from './sticker';

/** Sticker card: 2px ink border, 4px hard drop, radius 26. */
export function Card({ children, style, tone = 'surf' }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: 'surf' | 'surf2' | 'turt' }) {
  const t = useHissaTheme();
  return <View style={[sticker(t, 4), { borderRadius: hissaRadii.card, backgroundColor: t[tone], padding: 16 }, style]}>{children}</View>;
}
