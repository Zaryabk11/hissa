import { HissaText } from '../../../shared/ui/hissa/HissaText';
import { PrimaryButton } from '../../../shared/ui/hissa/PrimaryButton';
import { Card } from '../../feel/components/Card';
import type { Goal } from '../api/goals';
import { socialContent as c } from '../content';
import { goalProgressLine } from '../social-view';

export function GoalCard({ goal, onShare, onAbandon }: { goal: Goal; onShare: () => void; onAbandon: () => void }) {
  return (
    <Card gap={8}>
      <HissaText variant="caption">{c.goal.title}</HissaText>
      <HissaText variant="label">{goal.title}</HissaText>
      <HissaText>{goalProgressLine(goal)}</HissaText>
      <HissaText variant="caption">{goal.shared ? c.goal.shared : c.goal.private}</HissaText>
      <PrimaryButton outline label={goal.shared ? c.goal.unshare : c.goal.share} onPress={onShare} />
      <PrimaryButton outline label={c.goal.abandon} onPress={onAbandon} />
    </Card>
  );
}
