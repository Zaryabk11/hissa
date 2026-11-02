import { Pressable } from 'react-native';
import { hissaRadii } from '../../theme/hissaTokens';
import { useHissaTheme } from '../../theme/HissaThemeProvider';
import { HissaText } from './HissaText';

export function PrimaryButton({ label, onPress, outline, disabled }: { label: string; onPress: () => void; outline?: boolean; disabled?: boolean }) {
  const t = useHissaTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      onPress={disabled ? undefined : onPress}
      style={{
        height: 52,
        borderRadius: hissaRadii.control,
        backgroundColor: outline ? 'transparent' : t.pri,
        borderWidth: outline ? 1 : 0,
        borderColor: t.hair,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <HissaText variant="button" style={{ color: outline ? t.ink : t.onPri }}>
        {label}
      </HissaText>
    </Pressable>
  );
}
