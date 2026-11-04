import { View } from 'react-native';
import { useHissaTheme } from '../../../shared/theme/HissaThemeProvider';
import { HissaText } from '../../../shared/ui/hissa/HissaText';
import { Pill } from '../../../shared/ui/hissa/Pill';
import { Card } from '../../feel/components/Card';
import type { Goal } from '../api/goals';
import { socialContent as c } from '../content';
import { goalProgressLine } from '../social-view';

export function GoalCard({ goal, busy, onShare, onAbandon }: { goal: Goal; busy: boolean; onShare: () => void; onAbandon: () => void }) {
  const t = useHissaTheme();
  const line = goalProgressLine(goal);
  return (
    <Card gap={12}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <HissaText variant="caption">{c.goal.title}</HissaText>
        <View style={{ paddingHorizontal: 10, paddingVertical: 2, borderRadius: 99, backgroundColor: goal.shared ? t.tint : t.bg }}>
          <HissaText variant="caption" style={{ color: goal.shared ? t.tintInk : t.muted }}>
            {goal.shared ? c.goal.shared : c.goal.private}
          </HissaText>
        </View>
      </View>
      <HissaText variant="value">{goal.title}</HissaText>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={line}
        accessibilityValue={{ min: 0, max: goal.target, now: Math.min(goal.progress, goal.target) }}
        style={{ height: 8, borderRadius: 4, backgroundColor: t.hair, overflow: 'hidden' }}
      >
        <View style={{ width: `${Math.min(1, goal.progress / goal.target) * 100}%`, height: 8, borderRadius: 4, backgroundColor: t.pri }} />
      </View>
      <HissaText variant="caption">{line}</HissaText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Pill grow disabled={busy} label={goal.shared ? c.goal.unshare : c.goal.share} onPress={onShare} />
        <Pill variant="quiet" disabled={busy} label={c.goal.abandon} onPress={onAbandon} />
      </View>
    </Card>
  );
}
