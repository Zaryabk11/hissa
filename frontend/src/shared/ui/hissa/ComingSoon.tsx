import { useHissaTheme } from '../../theme/HissaThemeProvider';
import { View } from 'react-native';
import { HissaScreen } from './HissaScreen';
import { HissaText } from './HissaText';

/** Placeholder for a tab that is not built yet. */
export function ComingSoon({ title, body, sub }: { title: string; body: string; sub: string }) {
  const t = useHissaTheme();
  return (
    <HissaScreen>
      <HissaText variant="title" accessibilityRole="header" style={{ marginTop: 8 }}>
        {title}
      </HissaText>
      <View style={{ marginTop: 40, borderRadius: 24, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.rim, padding: 32, alignItems: 'center' }}>
        <HissaText variant="title" style={{ fontSize: 22, lineHeight: 28, textAlign: 'center' }}>
          {body}
        </HissaText>
        <HissaText muted style={{ marginTop: 6, textAlign: 'center' }}>
          {sub}
        </HissaText>
      </View>
    </HissaScreen>
  );
}
