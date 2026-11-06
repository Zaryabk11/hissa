import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { hissaRadii } from '../../theme/hissaTokens';
import { useHissaTheme } from '../../theme/HissaThemeProvider';

/** Cream sheet with a 36px top radius that sits over the backdrop. */
export function Panel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useHissaTheme();
  return (
    <View
      style={[
        { backgroundColor: t.surf, borderTopLeftRadius: hissaRadii.panel, borderTopRightRadius: hissaRadii.panel, borderWidth: 2, borderBottomWidth: 0, borderColor: t.line, padding: 20 },
        style,
      ]}
    >
      {children}
    </View>
  );
}
