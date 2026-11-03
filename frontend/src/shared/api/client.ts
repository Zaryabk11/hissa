import type { Session } from '@supabase/supabase-js';
import { setUsableSession } from '../auth/session-state';

const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(public status: number, method: string, public path: string) {
    super(`${method} ${path} failed with ${status}`);
  }
}

export async function apiAuthed<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { supabase } = await import('../auth/supabase');
  let session: Session;
  try {
    const current = await supabase.auth.getSession();
    if (current.error || !current.data.session) throw new Error('Session unavailable');
    session = current.data.session;
    if (!session.expires_at || session.expires_at <= Date.now() / 1000 + 30) {
      const refreshed = await supabase.auth.refreshSession();
      if (refreshed.error || !refreshed.data.session) throw new Error('Session refresh failed');
      session = refreshed.data.session;
    }
  } catch {
    // Retryable refresh errors preserve Supabase's cached session without a SIGNED_OUT event.
    setUsableSession(null);
    throw new Error('Sign in again to continue.');
  }
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${session.access_token}`);
  const res = await fetch(`${baseUrl}${path}`, {
    signal: AbortSignal.timeout(15_000),
    ...init,
    headers,
  });
  if (res.status === 401) {
    setUsableSession(null);
    await supabase.auth.signOut({ scope: 'local' });
    throw new Error('Sign in again to continue.');
  }
  if (!res.ok) throw new ApiError(res.status, init.method ?? 'GET', path);
  return (res.status === 204 ? undefined : await res.json()) as T;
}
