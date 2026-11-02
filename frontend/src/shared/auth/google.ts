import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogle(): Promise<void> {
  const redirectTo = 'hissa://';
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error('Could not open Google sign-in.');
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return;
  const callback = new URL(result.url);
  if (callback.protocol !== 'hissa:') throw new Error('Unexpected sign-in callback.');
  const code = callback.searchParams.get('code');
  if (!code) throw new Error('Google sign-in was not completed. Please try again.');
  const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
  if (sessionError) throw sessionError;
}
