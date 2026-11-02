import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import { hydrateAnswers } from '../src/features/onboarding/store';
import { hydrateMeals } from '../src/features/today/mealsStore';
import { SessionProvider, useSession } from '../src/shared/auth/session';

function Routes() {
  const { session, loading } = useSession();
  // Load saved onboarding answers and meals once; Today shows its skeleton until both are in.
  useEffect(() => {
    hydrateAnswers();
    hydrateMeals();
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
