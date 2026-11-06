import { Pressable } from 'react-native';
import { hissaRadii, MIN_TAP } from '../../theme/hissaTokens';
import { useHissaTheme } from '../../theme/HissaThemeProvider';
import { HissaText } from './HissaText';
import { sticker, useFocusRing } from './sticker';

/** Tonal button (surf2 fill, same border) for secondary actions. */
export function SecondaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const t = useHissaTheme();
  const focus = useFocusRing(t);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      onPress={disabled ? undefined : onPress}
      {...focus.handlers}
      style={[
        sticker(t, 3),
        { minHeight: MIN_TAP, paddingHorizontal: 20, borderRadius: hissaRadii.control + 12, backgroundColor: t.surf2, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : 1 },
        focus.style,
      ]}
    >
      <HissaText variant="button">{label}</HissaText>
    </Pressable>
  );
}
