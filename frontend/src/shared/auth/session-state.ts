import type { Session } from '@supabase/supabase-js';

// Shared by React's route guard and API recovery, including failures that emit no auth event.
let session: Session | null = null;
const listeners = new Set<() => void>();

export function getSessionSnapshot(): Session | null {
  return session;
}

export function setUsableSession(next: Session | null): void {
  session = next?.expires_at && next.expires_at > Date.now() / 1000 ? next : null;
  listeners.forEach((listener) => listener());
}

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
