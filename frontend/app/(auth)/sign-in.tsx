import { useState } from 'react';
import { Button, Text } from 'react-native';
import { signInWithGoogle } from '../../src/shared/auth/google';
import { Screen } from '../../src/shared/ui/Screen';

export default function SignIn() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signIn = async () => {
    setBusy(true);
    setError(null);
    try { await signInWithGoogle(); }
    catch { setError('Could not sign in. Please try again.'); }
    finally { setBusy(false); }
  };
  return (
    <Screen title="Sign in">
      <Button title={busy ? 'Opening Google…' : 'Continue with Google'} disabled={busy} onPress={signIn} />
      {error && <Text accessibilityRole="alert">{error}</Text>}
    </Screen>
  );
}
