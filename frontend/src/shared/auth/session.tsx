import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { supabase } from './supabase';
import { getSessionSnapshot, setUsableSession, subscribeSession } from './session-state';

type SessionState = { session: Session | null; loading: boolean; signOut: () => Promise<void> };
const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(subscribeSession, getSessionSnapshot, getSessionSnapshot);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setUsableSession(nextSession);
        setLoading(false);
      }
    });
    // getSession refreshes expired persisted tokens before returning them.
    void supabase.auth.getSession().then(({ data, error }) => {
      if (active) {
        setUsableSession(error ? null : data.session);
        setLoading(false);
      }
    }).catch(() => {
      if (active) { setUsableSession(null); setLoading(false); }
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
    setUsableSession(null);
  };

  return <SessionContext.Provider value={{ session, loading, signOut }}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession requires SessionProvider.');
  return value;
}
