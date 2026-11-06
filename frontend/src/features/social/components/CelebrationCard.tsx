import { View } from 'react-native';
import { Card } from '../../../shared/ui/hissa/Card';
import { HissaText } from '../../../shared/ui/hissa/HissaText';
import { Pill } from '../../../shared/ui/hissa/Pill';
import type { Celebration } from '../api/goals';
import { socialContent as c } from '../content';
import { personName } from '../social-view';

export function CelebrationCard({ item, busy, onCheer }: { item: Celebration; busy: boolean; onCheer: () => void }) {
  return (
    <Card tone="turt" style={{ gap: 12 }}>
      <HissaText variant="label">
        {c.celebration(personName(item.actor), item.title)}
      </HissaText>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <HissaText variant="caption">
          {c.cheers(item.cheers)}
        </HissaText>
        <Pill variant="filled" disabled={item.cheeredByMe || busy} label={item.cheeredByMe ? c.cheered : c.cheer} onPress={onCheer} />
      </View>
    </Card>
  );
}
