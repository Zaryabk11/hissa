import Svg, { Path } from 'react-native-svg';
import { Pressable, View } from 'react-native';
import { hissaRadii } from '../../theme/hissaTokens';
import { useHissaTheme } from '../../theme/HissaThemeProvider';
import { HissaText } from './HissaText';

type Props = { title: string; sub: string; selected: boolean; onPress: () => void };

/** A full-width single-choice card with a check dot (radio semantics). */
export function OptionCard({ title, sub, selected, onPress }: Props) {
  const t = useHissaTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}. ${sub}`}
      onPress={onPress}
      style={{
        minHeight: 72,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: hissaRadii.control,
        backgroundColor: t.surf,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? t.pri : t.hair,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <View style={{ flex: 1 }}>
        <HissaText variant="label">{title}</HissaText>
        <HissaText variant="caption">{sub}</HissaText>
      </View>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: selected ? 0 : 1.5,
          borderColor: t.rim,
          backgroundColor: selected ? t.pri : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected && (
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={t.onPri} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M5 12l4 4 10-10" />
          </Svg>
        )}
      </View>
    </Pressable>
  );
}

/** A compact single-choice pill (radio semantics). */
export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const t = useHissaTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        flex: 1,
        height: 48,
        borderRadius: hissaRadii.control,
        backgroundColor: selected ? t.pri : t.surf,
        borderWidth: selected ? 0 : 1,
        borderColor: t.hair,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <HissaText variant="button" style={{ color: selected ? t.onPri : t.ink }}>
        {label}
      </HissaText>
    </Pressable>
  );
}
