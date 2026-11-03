import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useHissaTheme } from '../../../shared/theme/HissaThemeProvider';

/** Hissa card: radius 18, 1px hairline, surface fill. */
export function Card({ children, gap = 12 }: { children: ReactNode; gap?: number }) {
  const t = useHissaTheme();
  return (
    <View
      style={{
        gap,
        padding: 16,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: t.hair,
        backgroundColor: t.surf,
      }}
    >
      {children}
    </View>
  );
}
