import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { hissaRadii, MIN_TAP } from '../../theme/hissaTokens';
import { useHissaTheme } from '../../theme/HissaThemeProvider';
import { HissaText } from './HissaText';
import { sticker, useFocusRing } from './sticker';

/** Solid green CTA with a round arrow chip. `outline` now renders the tonal (surf2) look: there are no outline-only buttons. */
export function PrimaryButton({ label, onPress, outline, disabled }: { label: string; onPress: () => void; outline?: boolean; disabled?: boolean }) {
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
        {
          minHeight: 52,
          borderRadius: hissaRadii.control + 12,
          backgroundColor: outline ? t.surf2 : t.pri,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          paddingLeft: 24,
          paddingRight: outline ? 24 : 8,
          opacity: disabled ? 0.4 : 1,
        },
        focus.style,
      ]}
    >
      <HissaText variant="button" style={{ color: outline ? t.ink : t.onPri }}>
        {label}
      </HissaText>
      {!outline && (
        <View style={{ width: MIN_TAP - 12, height: MIN_TAP - 12, borderRadius: 16, backgroundColor: t.onPri, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={t.pri} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M5 12h14M13 6l6 6-6 6" />
          </Svg>
        </View>
      )}
    </Pressable>
  );
}
