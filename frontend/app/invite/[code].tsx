import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { rememberInvite, useSession } from '../../src/shared/auth/session';
import { useHissaTheme } from '../../src/shared/theme/HissaThemeProvider';

export default function InviteHandoff() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { session, loading } = useSession();
  const t = useHissaTheme(); // this route sits outside HissaRoot, so it gets the default Graphite theme
  const [saved, setSaved] = useState(false);
  const valid = typeof code === 'string' && /^[A-Z0-9]{6}$/.test(code);
  useEffect(() => {
    if (valid) void rememberInvite(code).then(() => setSaved(true));
  }, [code, valid]);
  if (!valid) return <Redirect href="/" />;
  if (loading || !saved)
    return (
      <View
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg }}
      >
        <ActivityIndicator accessibilityLabel="Opening invitation" color={t.pri} />
      </View>
    );
  return (
    <Redirect
      href={session ? { pathname: '/(tabs)/buddy', params: { code } } : '/(auth)/sign-in'}
    />
  );
}
