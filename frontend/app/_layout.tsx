import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Platform } from 'react-native';
import { CursorRing } from '../src/features/landing/components/CursorRing';
import { hydrateAnswers } from '../src/features/onboarding/store';
import { SessionProvider, useSession } from '../src/shared/auth/session';
import { IrisProvider } from '../src/shared/ui/hissa/IrisTransition';
import { HissaRoot } from '../src/shared/ui/hissa/HissaRoot';
import { HissaScreen } from '../src/shared/ui/hissa/HissaScreen';

function Routes() {
  const { session, loading } = useSession();
  // Saved onboarding answers let a newly signed-in user finish the profile they started.
  useEffect(() => {
    hydrateAnswers();
  }, []);
  if (loading)
    return (
      <HissaRoot>
        <HissaScreen>
          <ActivityIndicator accessibilityLabel="Loading session" />
        </HissaScreen>
      </HissaRoot>
    );
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="landing" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(scan)" />
        <Stack.Screen name="(account)" />
        <Stack.Screen name="meals" />
        <Stack.Screen name="inbox" />
        <Stack.Screen name="snap" />
        <Stack.Screen name="recipes" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <IrisProvider>
        <Routes />
      </IrisProvider>
      {/* One ring for every screen: it hides the native cursor, so it must not live on a single route. */}
      {Platform.OS === 'web' && <CursorRing />}
    </SessionProvider>
  );
}
