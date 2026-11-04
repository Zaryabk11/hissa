import { useRef, useState } from 'react';
import { View } from 'react-native';
import { HissaText } from '../../../shared/ui/hissa/HissaText';
import { Pill } from '../../../shared/ui/hissa/Pill';
import { Card } from '../../feel/components/Card';
import { searchPeople, sendRequest, type FriendsOverview, type PersonCard } from '../api/friends';
import { socialContent as c } from '../content';
import { personName } from '../social-view';
import { Avatar } from './Avatar';
import { TextField } from './TextField';

function Person({ p, children }: { p: PersonCard; children?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      <Avatar name={personName(p)} />
      <HissaText variant="label" numberOfLines={1} style={{ flex: 1, minWidth: 100 }}>
        {personName(p)}
      </HissaText>
      {children}
    </View>
  );
}

export function AddFriend({
  overview,
  busy,
  onRespond,
  onSent,
}: {
  overview: FriendsOverview;
  busy: boolean;
  onRespond: (userId: string, d: 'accept' | 'decline') => void;
  onSent: () => void;
}) {
  const [text, setText] = useState('');
  const [results, setResults] = useState<PersonCard[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const lock = useRef(false);
  const off = busy || sending;

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
    if (lock.current) return;
    lock.current = true;
    setSending(true);
    try {
      await sendRequest(p.username!);
      setResults((r) => r && r.filter((x) => x.userId !== p.userId));
      setMessage(c.add.sent);
      onSent();
    } catch {
      setMessage(c.add.failed);
    } finally {
      lock.current = false;
      setSending(false);
    }
  }

  return (
    <View style={{ gap: 12 }}>
      {overview.incoming.length > 0 && (
        <Card>
          <HissaText variant="label">{c.add.incoming}</HissaText>
          {overview.incoming.map((p) => (
            <Person key={p.userId} p={p}>
              <Pill variant="filled" disabled={off} label={c.add.accept} onPress={() => onRespond(p.userId, 'accept')} />
              <Pill variant="quiet" disabled={off} label={c.add.decline} onPress={() => onRespond(p.userId, 'decline')} />
            </Person>
          ))}
        </Card>
      )}
      <Card>
        <HissaText variant="label" accessibilityRole="header">
          {c.add.title}
        </HissaText>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <TextField accessibilityLabel={c.add.label} placeholder={c.add.label} value={text} onChangeText={setText} onSubmitEditing={() => void search()} />
          </View>
          <Pill variant="filled" label={c.add.search} onPress={() => void search()} />
        </View>
        {message && <HissaText accessibilityRole="alert">{message}</HissaText>}
        {results?.length === 0 && <HissaText muted>{c.add.none}</HissaText>}
        {results?.map((p) => (
          <Person key={p.userId} p={p}>
            <Pill variant="filled" disabled={off} label={c.add.send} onPress={() => void send(p)} />
          </Person>
        ))}
      </Card>
      {overview.outgoing.length > 0 && (
        <Card>
          <HissaText variant="label">{c.add.outgoing}</HissaText>
          {overview.outgoing.map((p) => (
            <Person key={p.userId} p={p} />
          ))}
        </Card>
      )}
    </View>
  );
}
