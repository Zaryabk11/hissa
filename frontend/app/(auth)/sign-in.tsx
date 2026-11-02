import { useState } from 'react';
import { View } from 'react-native';
import { signInWithGoogle } from '../../src/shared/auth/google';
import { HissaRoot } from '../../src/shared/ui/hissa/HissaRoot';
import { HissaScreen } from '../../src/shared/ui/hissa/HissaScreen';
import { HissaText } from '../../src/shared/ui/hissa/HissaText';
import { PrimaryButton } from '../../src/shared/ui/hissa/PrimaryButton';

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
    <HissaRoot>
      <HissaScreen>
        <View style={{ marginTop: 80, gap: 12 }}>
          <HissaText variant="title" accessibilityRole="header">Welcome to Hissa</HissaText>
          <HissaText muted>Your plate, your portion. Sign in to save your meals and share a streak.</HissaText>
          <View style={{ marginTop: 24 }}><PrimaryButton label={busy ? 'Opening Google…' : 'Continue with Google'} disabled={busy} onPress={() => void signIn()} /></View>
          {error && <HissaText accessibilityRole="alert">{error}</HissaText>}
        </View>
      </HissaScreen>
    </HissaRoot>
  );
}
