import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { rememberInvite, useSession } from '../../src/shared/auth/session';

export default function InviteHandoff() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { session, loading } = useSession();
  const [saved, setSaved] = useState(false);
  const valid = typeof code === 'string' && /^[A-Z0-9]{6}$/.test(code);
  useEffect(() => {
    if (valid) void rememberInvite(code).then(() => setSaved(true));
  }, [code, valid]);
  if (!valid) return <Redirect href="/" />;
  if (loading || !saved) return <ActivityIndicator accessibilityLabel="Opening invitation" />;
  return <Redirect href={session ? { pathname: '/(tabs)/buddy', params: { code } } : '/(auth)/sign-in'} />;
}
