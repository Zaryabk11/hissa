import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiAuthed, apiGet } from '../client';
import type { Session } from '@supabase/supabase-js';
import { getSessionSnapshot, setUsableSession, subscribeSession } from '../../auth/session-state';

const auth = vi.hoisted(() => ({ getSession: vi.fn(), refreshSession: vi.fn(), signOut: vi.fn() }));
vi.mock('../../auth/supabase', () => ({ supabase: { auth } }));
const fetchMock = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
  setUsableSession(null);
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'u1' }) });
});

describe('API authentication', () => {
  it('rejects missing sessions without sending a request', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    await expect(apiAuthed('/api/auth')).rejects.toThrow('Sign in');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('attaches the session token and preserves caller headers and method', async () => {
    auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token', expires_at: Date.now() / 1000 + 3600 } },
      error: null,
    });
    await apiAuthed('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'wrong' },
    });
    const init = fetchMock.mock.calls[0][1];
    expect(init.method).toBe('POST');
    expect(init.headers.get('Authorization')).toBe('Bearer token');
    expect(init.headers.get('Content-Type')).toBe('application/json');
    expect(init.signal).toBeInstanceOf(AbortSignal); // a hung request must not stall the screen
  });

  it('refreshes an expired session before the request', async () => {
    auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'old', expires_at: 1 } },
      error: null,
    });
    auth.refreshSession.mockResolvedValue({
      data: { session: { access_token: 'fresh' } },
      error: null,
    });
    await apiAuthed('/api/auth');
    expect(fetchMock.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer fresh');
  });

  it('sends no request if expired-session refresh fails', async () => {
    auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'old', expires_at: 1 } },
      error: null,
    });
    auth.refreshSession.mockResolvedValue({ data: { session: null }, error: new Error('expired') });
    await expect(apiAuthed('/api/auth')).rejects.toThrow('Sign in');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('closes the shared tab guard when retryable refresh fails without SIGNED_OUT', async () => {
    const cached = { access_token: 'cached', expires_at: Date.now() / 1000 + 3600 } as Session;
    setUsableSession(cached);
    let tabsOpen = !!getSessionSnapshot();
    const unsubscribe = subscribeSession(() => {
      tabsOpen = !!getSessionSnapshot();
    });
    expect(tabsOpen).toBe(true);
    // Supabase retains its persisted session on retryable network errors and emits no SIGNED_OUT.
    auth.getSession.mockResolvedValue({
      data: { session: { ...cached, expires_at: 1 } },
      error: null,
    });
    auth.refreshSession.mockResolvedValue({
      data: { session: null },
      error: new Error('retryable network failure'),
    });
    await expect(apiAuthed('/api/auth')).rejects.toThrow('Sign in');
    expect(tabsOpen).toBe(false);
    expect(getSessionSnapshot()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('closes the shared guard if getSession itself fails to recover', async () => {
    setUsableSession({ access_token: 'cached', expires_at: Date.now() / 1000 + 3600 } as Session);
    auth.getSession.mockResolvedValue({
      data: { session: null },
      error: new Error('retryable network failure'),
    });
    await expect(apiAuthed('/api/auth')).rejects.toThrow('Sign in');
    expect(getSessionSnapshot()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('closes a rejected session without retrying the request', async () => {
    auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'revoked', expires_at: Date.now() / 1000 + 3600 } },
      error: null,
    });
    auth.signOut.mockResolvedValue({ error: null });
    fetchMock.mockResolvedValue({ ok: false, status: 401 });
    await expect(apiAuthed('/api/auth')).rejects.toThrow('Sign in');
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps health requests anonymous', async () => {
    await apiGet('/api/health');
    expect(auth.getSession).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/health'));
  });
});
