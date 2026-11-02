import 'react-native-url-polyfill/auto';
import { createClient, processLock } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('Configure the public Supabase URL and anon/publishable key.');

export const supabase = createClient(url, key, {
  auth: {
    storage: {
      getItem: (name) => SecureStore.getItemAsync(name),
      setItem: (name, value) => SecureStore.setItemAsync(name, value),
      removeItem: (name) => SecureStore.deleteItemAsync(name),
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
    lock: processLock,
  },
});
