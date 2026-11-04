import { View } from 'react-native';
import { useHissaTheme } from '../../../shared/theme/HissaThemeProvider';
import { HissaText } from '../../../shared/ui/hissa/HissaText';
import { Pill } from '../../../shared/ui/hissa/Pill';
import type { Celebration } from '../api/goals';
import { socialContent as c } from '../content';
import { personName } from '../social-view';

export function CelebrationCard({ item, busy, onCheer }: { item: Celebration; busy: boolean; onCheer: () => void }) {
  const t = useHissaTheme();
  return (
    <View style={{ gap: 12, padding: 16, borderRadius: 18, backgroundColor: t.tint }}>
      <HissaText variant="label" style={{ color: t.tintInk }}>
        {c.celebration(personName(item.actor), item.title)}
      </HissaText>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <HissaText variant="caption" style={{ color: t.tintInk }}>
          {c.cheers(item.cheers)}
        </HissaText>
        <Pill variant="filled" disabled={item.cheeredByMe || busy} label={item.cheeredByMe ? c.cheered : c.cheer} onPress={onCheer} />
      </View>
    </View>
  );
}
