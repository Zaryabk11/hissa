import { Stack } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { SessionProvider, useSession } from '../src/shared/auth/session';

function Routes() {
  const { session, loading } = useSession();
  if (loading) return <ActivityIndicator accessibilityLabel="Loading session" />;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="invite/[code]" />
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return <SessionProvider><Routes /></SessionProvider>;
}
