import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { getPendingInvite, useSession } from '../src/shared/auth/session';

// Signed-out visitors see the landing page (or sign in when they arrived through an invite link).
export default function Index() {
  const { session, loading } = useSession();
  const [code, setCode] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    void getPendingInvite()
      .then(setCode)
      .catch(() => setCode(null));
  }, []);
  if (loading || code === undefined)
    return <ActivityIndicator accessibilityLabel="Loading session" />;
  if (!session) return <Redirect href={code ? '/(auth)/sign-in' : '/landing'} />;
  return (
    <Redirect href={code ? { pathname: '/(tabs)/buddy', params: { code } } : '/(tabs)/today'} />
  );
}
