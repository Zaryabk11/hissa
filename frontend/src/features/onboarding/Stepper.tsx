import { Pressable, View } from 'react-native';
import { useHissaTheme } from '../../shared/theme/HissaThemeProvider';
import { hissaRadii } from '../../shared/theme/hissaTokens';
import { HissaText } from '../../shared/ui/hissa/HissaText';
import { sticker, useFocusRing } from '../../shared/ui/hissa/sticker';

function StepButton({ glyph, label, onPress }: { glyph: string; label: string; onPress: () => void }) {
  const t = useHissaTheme();
  const focus = useFocusRing(t);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      {...focus.handlers}
      style={[sticker(t, 2), { width: 48, height: 48, borderRadius: hissaRadii.control, backgroundColor: t.surf2, alignItems: 'center', justifyContent: 'center' }, focus.style]}
    >
      <HissaText style={{ fontSize: 22, lineHeight: 28 }} variant="label">
        {glyph}
      </HissaText>
    </Pressable>
  );
}

/** A label with minus/plus around a value; also adjustable by screen readers. Shared by onboarding and Profile. */
export function StepperRow(p: { label: string; shown: string; unit: string; decrease: string; increase: string; onChange: (d: number) => void }) {
  const t = useHissaTheme();
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`${p.label}, ${p.shown} ${p.unit}`.trim()}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => p.onChange(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
      style={[sticker(t, 3), { minHeight: 72, paddingVertical: 8, paddingLeft: 16, paddingRight: 12, borderRadius: hissaRadii.card, backgroundColor: t.surf, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }]}
    >
      <HissaText variant="button" muted style={{ flex: 1, minWidth: 56 }}>
        {p.label}
      </HissaText>
      <StepButton glyph="-" label={p.decrease} onPress={() => p.onChange(-1)} />
      <View style={{ minWidth: 64, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
        <HissaText variant="value">{p.shown}</HissaText>
        {p.unit !== '' && <HissaText variant="caption">{p.unit}</HissaText>}
      </View>
      <StepButton glyph="+" label={p.increase} onPress={() => p.onChange(1)} />
    </View>
  );
}
