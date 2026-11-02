const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed with ${res.status}`);
  return (await res.json()) as T;
}

export async function apiAuthed<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { supabase } = await import('../auth/supabase');
  const current = await supabase.auth.getSession();
  if (current.error || !current.data.session) throw new Error('Sign in to continue.');
  let session = current.data.session;
  if (!session.expires_at || session.expires_at <= Date.now() / 1000 + 30) {
    const refreshed = await supabase.auth.refreshSession();
    if (refreshed.error || !refreshed.data.session) throw new Error('Sign in again to continue.');
    session = refreshed.data.session;
  }
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${session.access_token}`);
  const res = await fetch(`${baseUrl}${path}`, { ...init, headers });
  if (res.status === 401) {
    await supabase.auth.signOut({ scope: 'local' });
    throw new Error('Sign in again to continue.');
  }
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} failed with ${res.status}`);
  return (res.status === 204 ? undefined : await res.json()) as T;
}
