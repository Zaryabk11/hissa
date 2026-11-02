import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { getProfile } from '../src/features/core/api';
import { getOnboardingFinished, getOnboardingOwner, hydrateAnswers } from '../src/features/onboarding/store';
import { canUseDraft } from '../src/features/onboarding/draftOwner';
import { ApiError } from '../src/shared/api/client';
import { getPendingInvite, useSession } from '../src/shared/auth/session';

// Signed-out visitors see the landing page (or sign in when they arrived through an invite link).
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
    return <ActivityIndicator accessibilityLabel="Loading session" />;
  if (!session) return <Redirect href={code ? '/(auth)/sign-in' : '/landing'} />;
  const target = destination?.userId === session.user.id ? destination.target : null;
  if (!code && target === 'error') return <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}><Text>Could not connect to Hissa.</Text><Pressable accessibilityRole="button" onPress={() => { setDestination(null); setRetry((n) => n + 1); }}><Text>Try again</Text></Pressable></View>;
  if (!code && !target) return <ActivityIndicator accessibilityLabel="Loading profile" />;
  if (!code && target === 'goal') return <Redirect href="/onboarding/goal" />;
  if (!code && target === 'budget') return <Redirect href="/onboarding/budget" />;
  return (
    <Redirect href={code ? { pathname: '/(tabs)/buddy', params: { code } } : '/(tabs)/today'} />
  );
}
