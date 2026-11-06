import { View } from 'react-native';
import { useHissaTheme } from '../../../shared/theme/HissaThemeProvider';
import { hissaFonts } from '../../../shared/theme/hissaTokens';
import { HissaText } from '../../../shared/ui/hissa/HissaText';

/** The first letter of a name on a tinted disc. Decorative: the name is always written beside it. */
export function Avatar({ name }: { name: string }) {
  const t = useHissaTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: t.line, backgroundColor: t.tint, alignItems: 'center', justifyContent: 'center' }}
    >
      <HissaText style={{ fontFamily: hissaFonts.display700, fontSize: 20, color: t.tintInk }}>{name.charAt(0).toUpperCase()}</HissaText>
    </View>
  );
}

/** A flame and a day count on a tinted pill. */
export function StreakPill({ days, label }: { days: number; label: string }) {
  const t = useHissaTheme();
  return (
    <View accessible accessibilityLabel={label} style={{ paddingHorizontal: 10, minHeight: 30, borderRadius: 15, borderWidth: 2, borderColor: t.line, backgroundColor: t.tint, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <HissaText accessibilityElementsHidden variant="caption" style={{ lineHeight: 18 }}>
        🔥
      </HissaText>
      <HissaText variant="button" style={{ color: t.tintInk, fontVariant: ['tabular-nums'] }}>
        {days}
      </HissaText>
    </View>
  );
}
