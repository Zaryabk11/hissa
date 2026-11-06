import { Pressable, View } from 'react-native';
import { MIN_TAP } from '../../theme/hissaTokens';
import { useHissaTheme } from '../../theme/HissaThemeProvider';
import { HissaText } from './HissaText';
import { sticker, useFocusRing } from './sticker';

function Seg({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const t = useHissaTheme();
  const focus = useFocusRing(t);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      onPress={onPress}
      {...focus.handlers}
      style={[{ flex: 1, minHeight: MIN_TAP, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.pri : 'transparent' }, focus.style]}
    >
      <HissaText variant="button" style={{ color: on ? t.onPri : t.ink }}>
        {label}
      </HissaText>
    </Pressable>
  );
}

/** Two to four mutually exclusive options in one rounded track. */
export function Segmented<V extends string>({ options, value, onChange }: { options: { value: V; label: string }[]; value: V; onChange: (v: V) => void }) {
  const t = useHissaTheme();
  return (
    <View accessibilityRole="radiogroup" style={[sticker(t, 0), { flexDirection: 'row', padding: 4, borderRadius: 99, backgroundColor: t.surf2 }]}>
      {options.map((o) => (
        <Seg key={o.value} label={o.label} on={o.value === value} onPress={() => onChange(o.value)} />
      ))}
    </View>
  );
}
