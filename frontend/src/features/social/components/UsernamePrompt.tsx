import { useState } from 'react';
import { View } from 'react-native';
import { ApiError } from '../../../shared/api/client';
import { HissaText } from '../../../shared/ui/hissa/HissaText';
import { PrimaryButton } from '../../../shared/ui/hissa/PrimaryButton';
import { Card } from '../../feel/components/Card';
import { setUsername } from '../api/profile';
import { socialContent as c } from '../content';
import { validUsername } from '../social-view';
import { TextField } from './TextField';

export function UsernamePrompt({ onSaved }: { onSaved: () => void }) {
  const [text, setText] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    const name = validUsername(text);
    if (!name) return setMessage(c.username.invalid);
    setBusy(true);
    try {
      await setUsername(name);
      onSaved();
    } catch (error) {
      setMessage(error instanceof ApiError && error.status === 409 ? c.username.taken : c.username.failed);
    }
    setBusy(false);
  }

  return (
    <Card>
      <HissaText variant="title" accessibilityRole="header">
        {c.username.title}
      </HissaText>
      <HissaText muted>{c.username.body}</HissaText>
      <TextField
        accessibilityLabel={c.username.label}
        maxLength={20}
        onChangeText={(v) => {
          setText(v);
          setMessage(null);
        }}
        onSubmitEditing={() => void save()}
        value={text}
      />
      {message && <HissaText accessibilityRole="alert">{message}</HissaText>}
      <View>
        <PrimaryButton disabled={busy} label={c.username.save} onPress={() => void save()} />
      </View>
    </Card>
  );
}
