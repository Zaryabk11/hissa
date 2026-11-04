import { useState } from 'react';
import { View } from 'react-native';
import { HissaText } from '../../../shared/ui/hissa/HissaText';
import { Pill } from '../../../shared/ui/hissa/Pill';
import type { FriendRow as Row } from '../api/friends';
import { socialContent as c } from '../content';
import { canNudge, friendStatus, personName } from '../social-view';
import { Avatar, StreakPill } from './Avatar';

export function FriendRow({ row, busy, onNudge, onRemove }: { row: Row; busy: boolean; onNudge: () => void; onRemove: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const status = friendStatus(row);
  const name = personName(row);
  return (
    <View style={{ gap: 8, paddingVertical: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar name={name} />
        <View style={{ flex: 1 }}>
          <HissaText variant="label" numberOfLines={1}>
            {name}
          </HissaText>
          <HissaText variant="caption">{status !== 'logged' && row.nudgedToday ? `${c.status[status]}. ${c.nudged}` : c.status[status]}</HissaText>
        </View>
        <StreakPill days={row.streak} label={c.streak(row.streak)} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 }}>
        {canNudge(row) && <Pill variant="filled" disabled={busy} label={c.nudge} onPress={onNudge} />}
        {confirm ? (
          <>
            <Pill variant="filled" disabled={busy} label={c.removeConfirm} onPress={onRemove} />
            <Pill variant="quiet" label={c.removeKeep} onPress={() => setConfirm(false)} />
          </>
        ) : (
          <Pill variant="quiet" disabled={busy} label={c.remove} onPress={() => setConfirm(true)} />
        )}
      </View>
    </View>
  );
}
