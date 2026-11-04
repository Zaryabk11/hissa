import { useState } from 'react';
import { View } from 'react-native';
import { HissaText } from '../../../shared/ui/hissa/HissaText';
import { PrimaryButton } from '../../../shared/ui/hissa/PrimaryButton';
import { Card } from '../../feel/components/Card';
import type { FriendRow as Row } from '../api/friends';
import { socialContent as c } from '../content';
import { canNudge, friendStatus, personName } from '../social-view';

export function FriendRow({ row, busy, onNudge, onRemove }: { row: Row; busy: boolean; onNudge: () => void; onRemove: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const status = friendStatus(row);
  return (
    <Card gap={8}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <HissaText variant="label">{personName(row)}</HissaText>
        <HissaText accessibilityLabel={c.streak(row.streak)}>{`🔥 ${row.streak}`}</HissaText>
      </View>
      <HissaText variant="caption">{c.status[status]}</HissaText>
      {canNudge(row) && <PrimaryButton outline disabled={busy} label={c.nudge} onPress={onNudge} />}
      {status !== 'logged' && row.nudgedToday && <HissaText variant="caption">{c.nudged}</HissaText>}
      {confirm ? (
        <>
          <PrimaryButton disabled={busy} label={c.removeConfirm} onPress={onRemove} />
          <PrimaryButton outline label={c.removeKeep} onPress={() => setConfirm(false)} />
        </>
      ) : (
        <PrimaryButton outline disabled={busy} label={c.remove} onPress={() => setConfirm(true)} />
      )}
    </Card>
  );
}
