import { Pressable } from 'react-native';
import { MIN_TAP } from '../../theme/hissaTokens';
import { useHissaTheme } from '../../theme/HissaThemeProvider';
import { HissaText } from './HissaText';
import { sticker, useFocusRing } from './sticker';

/** A compact action button for rows and cards. `filled` is the one main action; `outline` is tonal; `quiet` has no border. */
export function Pill({
  label,
  onPress,
  variant = 'outline',
  disabled,
  grow,
}: {
  label: string;
  onPress: () => void;
  variant?: 'filled' | 'outline' | 'quiet';
  disabled?: boolean;
  grow?: boolean;
}) {
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
        variant === 'quiet' ? {} : sticker(t, 2),
        {
          minHeight: MIN_TAP,
          paddingHorizontal: 18,
          flexGrow: grow ? 1 : 0,
          borderRadius: MIN_TAP / 2,
          backgroundColor: variant === 'filled' ? t.pri : variant === 'outline' ? t.surf2 : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.4 : 1,
        },
        focus.style,
      ]}
    >
      <HissaText variant="button" style={{ color: variant === 'filled' ? t.onPri : variant === 'quiet' ? t.muted : t.ink }}>
        {label}
      </HissaText>
    </Pressable>
  );
}
