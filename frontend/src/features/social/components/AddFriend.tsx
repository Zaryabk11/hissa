import { useState } from 'react';
import { View } from 'react-native';
import { HissaText } from '../../../shared/ui/hissa/HissaText';
import { PrimaryButton } from '../../../shared/ui/hissa/PrimaryButton';
import { Card } from '../../feel/components/Card';
import { searchPeople, sendRequest, type FriendsOverview, type PersonCard } from '../api/friends';
import { socialContent as c } from '../content';
import { personName } from '../social-view';
import { TextField } from './TextField';

function Person({ p, children }: { p: PersonCard; children?: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <HissaText variant="label">{personName(p)}</HissaText>
      {children}
    </View>
  );
}

export function AddFriend({
  overview,
  onRespond,
  onSent,
}: {
  overview: FriendsOverview;
  onRespond: (userId: string, d: 'accept' | 'decline') => void;
  onSent: () => void;
}) {
  const [text, setText] = useState('');
  const [results, setResults] = useState<PersonCard[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function search() {
    const q = text.trim().toLowerCase();
    if (q.length < 3) return setMessage(c.add.minChars);
    try {
      setResults(await searchPeople(q));
      setMessage(null);
    } catch {
      setMessage(c.actionFailed);
    }
  }

  async function send(p: PersonCard) {
    try {
      await sendRequest(p.username!);
      setResults((r) => r && r.filter((x) => x.userId !== p.userId));
      setMessage(c.add.sent);
      onSent();
    } catch {
      setMessage(c.add.failed);
    }
  }

  return (
    <View style={{ gap: 12 }}>
      {overview.incoming.length > 0 && (
        <Card>
          <HissaText variant="label">{c.add.incoming}</HissaText>
          {overview.incoming.map((p) => (
            <Person key={p.userId} p={p}>
              <PrimaryButton label={c.add.accept} onPress={() => onRespond(p.userId, 'accept')} />
              <PrimaryButton outline label={c.add.decline} onPress={() => onRespond(p.userId, 'decline')} />
            </Person>
          ))}
        </Card>
      )}
      <Card>
        <HissaText variant="label" accessibilityRole="header">
          {c.add.title}
        </HissaText>
        <TextField accessibilityLabel={c.add.label} placeholder={c.add.label} value={text} onChangeText={setText} onSubmitEditing={() => void search()} />
        <PrimaryButton outline label={c.add.search} onPress={() => void search()} />
        {message && <HissaText accessibilityRole="alert">{message}</HissaText>}
        {results?.length === 0 && <HissaText muted>{c.add.none}</HissaText>}
        {results?.map((p) => (
          <Person key={p.userId} p={p}>
            <PrimaryButton label={c.add.send} onPress={() => void send(p)} />
          </Person>
        ))}
      </Card>
      {overview.outgoing.length > 0 && (
        <Card>
          <HissaText variant="label">{c.add.outgoing}</HissaText>
          {overview.outgoing.map((p) => (
            <HissaText key={p.userId}>{personName(p)}</HissaText>
          ))}
        </Card>
      )}
    </View>
  );
}
