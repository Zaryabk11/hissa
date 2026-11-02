import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import { hydrateAnswers } from '../src/features/onboarding/store';
import { SessionProvider, useSession } from '../src/shared/auth/session';

function Routes() {
  const { session, loading } = useSession();
  // Saved onboarding answers let a newly signed-in user finish the profile they started.
  useEffect(() => {
    hydrateAnswers();
  }, []);
  if (loading) return <ActivityIndicator accessibilityLabel="Loading session" />;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="landing" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="invite/[code]" />
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(scan)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <Routes />
    </SessionProvider>
  );
}
