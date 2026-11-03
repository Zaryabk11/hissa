import { Pressable } from 'react-native';
import { HissaText } from '../../../shared/ui/hissa/HissaText';
import { historyContent as c } from '../content';

export function BackHeader({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={c.back}
      onPress={onPress}
      style={{ minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', paddingRight: 12 }}
    >
      <HissaText variant="button">{`< ${c.back}`}</HissaText>
    </Pressable>
  );
}
