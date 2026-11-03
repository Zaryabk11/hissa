import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { getProfile } from '../src/features/core/api';
import { getOnboardingFinished, getOnboardingOwner, hydrateAnswers } from '../src/features/onboarding/store';
import { canUseDraft } from '../src/features/onboarding/draftOwner';
import { ApiError } from '../src/shared/api/client';
import { getPendingInvite, useSession } from '../src/shared/auth/session';
import { useHissaTheme } from '../src/shared/theme/HissaThemeProvider';
import { HissaRoot } from '../src/shared/ui/hissa/HissaRoot';
import { HissaText } from '../src/shared/ui/hissa/HissaText';
import { PrimaryButton } from '../src/shared/ui/hissa/PrimaryButton';

function StatusBody({ label, onRetry }: { label: string; onRetry?: () => void }) {
  const t = useHissaTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24, backgroundColor: t.bg }}>
      {onRetry ? (
        <>
          <HissaText accessibilityRole="alert">Could not connect to Hissa.</HissaText>
          <View style={{ width: '100%', maxWidth: 320 }}>
            <PrimaryButton label="Try again" onPress={onRetry} />
          </View>
        </>
      ) : (
        <ActivityIndicator accessibilityLabel={label} color={t.pri} />
      )}
    </View>
  );
}

/** Themed full-screen status while the session or profile loads, or when the profile cannot be reached. */
const Status = (props: { label: string; onRetry?: () => void }) => (
  <HissaRoot>
    <StatusBody {...props} />
  </HissaRoot>
);

// Signed-out: the website gets the landing page; the app (and any invite link) goes straight to sign in.
export default function Index() {
  const { session, loading } = useSession();
  const [code, setCode] = useState<string | null | undefined>(undefined);
  const [destination, setDestination] = useState<{ userId: string; target: 'today' | 'goal' | 'budget' | 'error' } | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    void getPendingInvite()
      .then(setCode)
      .catch(() => setCode(null));
  }, []);
  useEffect(() => {
    if (!session || code === undefined || code) return;
    let live = true;
    void hydrateAnswers().then(() => getProfile()).then(() => {
      if (live) setDestination({ userId: session.user.id, target: 'today' });
    }).catch((error) => {
      if (!live) return;
      setDestination({ userId: session.user.id, target: error instanceof ApiError && error.status === 404 ? (canUseDraft(getOnboardingFinished(), getOnboardingOwner(), session.user.id) ? 'budget' : 'goal') : 'error' });
    });
    return () => { live = false; };
  }, [session, code, retry]);
  if (loading || code === undefined)
    return <Status label="Loading session" />;
  if (!session) return <Redirect href={code || Platform.OS !== 'web' ? '/(auth)/sign-in' : '/landing'} />;
  const target = destination?.userId === session.user.id ? destination.target : null;
  if (!code && target === 'error') return <Status label="Could not connect" onRetry={() => { setDestination(null); setRetry((n) => n + 1); }} />;
  if (!code && !target) return <Status label="Loading profile" />;
  if (!code && target === 'goal') return <Redirect href="/onboarding/goal" />;
  if (!code && target === 'budget') return <Redirect href="/onboarding/budget" />;
  return (
    <Redirect href={code ? { pathname: '/(tabs)/buddy', params: { code } } : '/(tabs)/today'} />
  );
}
