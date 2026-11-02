import { Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useHissaTheme } from '../../shared/theme/HissaThemeProvider';
import { scanContent as c } from './content';

/** Round close button (48px, above the 44 minimum). `onPhoto` puts a dark disc behind it for use over a photo. */
export function CloseButton({ onPress, onPhoto }: { onPress: () => void; onPhoto?: boolean }) {
  const t = useHissaTheme();
  const color = onPhoto ? '#FFFFFF' : t.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={c.close}
      onPress={onPress}
      style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: onPhoto ? 'rgba(0,0,0,.55)' : 'transparent', alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round">
        <Path d="M6 6l12 12M18 6L6 18" />
      </Svg>
    </Pressable>
  );
}
