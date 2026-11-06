import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { signInWithGoogle } from '../../src/shared/auth/google';
import { Dabbu } from '../../src/shared/ui/hissa/Dabbu';
import { HissaRoot } from '../../src/shared/ui/hissa/HissaRoot';
import { HissaScreen } from '../../src/shared/ui/hissa/HissaScreen';
import { HissaText } from '../../src/shared/ui/hissa/HissaText';
import { PrimaryButton } from '../../src/shared/ui/hissa/PrimaryButton';
import { Wordmark } from '../../src/shared/ui/hissa/Wordmark';

export default function SignIn() {
  const router = useRouter();
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
        <View style={{ marginTop: 24, alignItems: 'center', gap: 12 }}>
          <Wordmark size={72} />
          <HissaText variant="title" accessibilityRole="header" style={{ textAlign: 'center' }}>One more roti is fine.</HissaText>
          <HissaText muted style={{ textAlign: 'center' }}>Snap your plate. See your portion in roti and katori. Sign in to save your meals and share a streak.</HissaText>
          <Dabbu mood="wave" size={120} />
          <View style={{ alignSelf: 'stretch', gap: 12, marginTop: 8 }}>
            <PrimaryButton label={busy ? 'Opening Google…' : 'Continue with Google'} disabled={busy} onPress={() => void signIn()} />
            <PrimaryButton outline label="Home" onPress={() => router.replace('/landing')} />
            {error && <HissaText accessibilityRole="alert" style={{ textAlign: 'center' }}>{error}</HissaText>}
          </View>
        </View>
      </HissaScreen>
    </HissaRoot>
  );
}
