import { HissaText } from '../../../shared/ui/hissa/HissaText';
import { PrimaryButton } from '../../../shared/ui/hissa/PrimaryButton';
import { Card } from '../../feel/components/Card';
import type { Celebration } from '../api/goals';
import { socialContent as c } from '../content';
import { personName } from '../social-view';

export function CelebrationCard({ item, busy, onCheer }: { item: Celebration; busy: boolean; onCheer: () => void }) {
  return (
    <Card gap={8}>
      <HissaText variant="label">{c.celebration(personName(item.actor), item.title)}</HissaText>
      <HissaText variant="caption">{c.cheers(item.cheers)}</HissaText>
      <PrimaryButton disabled={item.cheeredByMe || busy} label={item.cheeredByMe ? c.cheered : c.cheer} onPress={onCheer} />
    </Card>
  );
}
