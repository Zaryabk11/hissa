import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogle(): Promise<void> {
  // iOS: a named callback host keeps Supabase from mangling the PKCE code in a bare `hissa://` URL.
  // Android: Expo Go only routes its own `exp://` address back, so use the Expo-provided one.
  const redirectTo = Platform.OS === 'ios' ? 'hissa://auth-callback' : Linking.createURL('');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error('Could not open Google sign-in.');
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return;
  // Compare scheme and host so the callback stays on the address we requested.
  const returned = new URL(result.url);
  const expected = new URL(redirectTo);
  if (returned.protocol !== expected.protocol || returned.host !== expected.host)
    throw new Error('Unexpected sign-in callback.');
  const code = returned.searchParams.get('code');
  if (!code) throw new Error('Google sign-in was not completed. Please try again.');
  const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
  if (sessionError) throw sessionError;
}
