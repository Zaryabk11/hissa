import type { Session } from '@supabase/supabase-js';
import { afterEach, expect, it } from 'vitest';
import { getSessionSnapshot, setUsableSession, subscribeSession } from './session-state';

afterEach(() => setUsableSession(null));

it('does not reopen the protected guard from a retained expired auth session', () => {
  let tabsOpen = false;
  const unsubscribe = subscribeSession(() => { tabsOpen = !!getSessionSnapshot(); });
  setUsableSession({ access_token: 'expired', expires_at: 1 } as Session);
  expect(tabsOpen).toBe(false);
  expect(getSessionSnapshot()).toBeNull();
  // A later successful auth recovery can open the same subscribed guard.
  setUsableSession({ access_token: 'fresh', expires_at: Date.now() / 1000 + 3600 } as Session);
  expect(tabsOpen).toBe(true);
  unsubscribe();
});
