import { Pressable } from 'react-native';
import { useHissaTheme } from '../../../shared/theme/HissaThemeProvider';
import { HissaText } from '../../../shared/ui/hissa/HissaText';
import { sticker, useFocusRing } from '../../../shared/ui/hissa/sticker';
import { historyContent as c } from '../content';

export function BackHeader({ onPress }: { onPress: () => void }) {
  const t = useHissaTheme();
  const focus = useFocusRing(t);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={c.back}
      onPress={onPress}
      {...focus.handlers}
      style={[sticker(t, 2), { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 16, borderRadius: 22, backgroundColor: t.surf2 }, focus.style]}
    >
      <HissaText variant="button">{`< ${c.back}`}</HissaText>
    </Pressable>
  );
}
