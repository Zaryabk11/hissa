import { useState } from 'react';
import { View } from 'react-native';
import { Card } from '../../../shared/ui/hissa/Card';
import { Dabbu } from '../../../shared/ui/hissa/Dabbu';
import { HissaText } from '../../../shared/ui/hissa/HissaText';
import { SecondaryButton } from '../../../shared/ui/hissa/SecondaryButton';
import type { FriendRow } from '../api/friends';
import { socialContent as c } from '../content';
import { friendStatus, personName } from '../social-view';

// Web only: native has no clipboard module installed, so the button is hidden there.
const clip = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;

/** Unpaired: your username to share. Paired: you and your first friend as two Dabbus with their streak. */
export function BuddyCard({ username, friend }: { username: string; friend?: FriendRow }) {
  const [copied, setCopied] = useState(false);
  if (friend) {
    const logged = friendStatus(friend) === 'logged';
    return (
      <Card style={{ alignItems: 'center', gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
          <Dabbu size={96} mood="idle" />
          <Dabbu size={96} tone="cloud" mood={logged ? 'content' : 'sleepy'} />
        </View>
        <HissaText variant="label" accessibilityRole="header">
          {`${personName(friend)}, ${c.streak(friend.streak)}`}
        </HissaText>
      </Card>
    );
  }
  return (
    <Card style={{ alignItems: 'center', gap: 8 }}>
      <Dabbu size={96} mood="lonely" />
      <HissaText variant="caption">{c.yourUsername}</HissaText>
      <HissaText variant="value" selectable>{`@${username}`}</HissaText>
      {clip && <SecondaryButton label={copied ? c.copied : c.copy} onPress={() => void clip.writeText(username).then(() => setCopied(true), () => undefined)} />}
    </Card>
  );
}
