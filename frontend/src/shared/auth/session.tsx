import type { Session } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { supabase } from './supabase';

const inviteKey = 'hissa.pending-invite';
export async function rememberInvite(code: string): Promise<void> {
  if (/^[A-Z0-9]{6}$/.test(code)) await SecureStore.setItemAsync(inviteKey, code);
}
export async function getPendingInvite(): Promise<string | null> {
  return SecureStore.getItemAsync(inviteKey);
}
export async function clearPendingInvite(): Promise<void> {
  await SecureStore.deleteItemAsync(inviteKey);
}

type SessionState = { session: Session | null; loading: boolean; signOut: () => Promise<void> };
const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
        setLoading(false);
      }
    });
    // getSession refreshes expired persisted tokens before returning them.
    void supabase.auth.getSession().then(({ data, error }) => {
      if (active) {
        setSession(error ? null : data.session);
        setLoading(false);
      }
    }).catch(() => {
      if (active) { setSession(null); setLoading(false); }
    });
    const refresh = (state: string | null | undefined) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    };
    refresh(AppState.currentState);
    const listener = AppState.addEventListener('change', refresh);
    return () => {
      active = false;
      subscription.unsubscribe();
      listener.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
    setSession(null);
  };

  return <SessionContext.Provider value={{ session, loading, signOut }}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession requires SessionProvider.');
  return value;
}
