import { beforeEach, expect, it, vi } from 'vitest';
import { signInWithGoogle } from './google';

const mocks = vi.hoisted(() => ({ signInWithOAuth: vi.fn(), exchangeCodeForSession: vi.fn(), openAuthSessionAsync: vi.fn() }));
vi.mock('./supabase', () => ({ supabase: { auth: mocks } }));
vi.mock('expo-web-browser', () => ({ openAuthSessionAsync: mocks.openAuthSessionAsync, maybeCompleteAuthSession: vi.fn() }));
beforeEach(() => {
  vi.resetAllMocks();
  mocks.signInWithOAuth.mockResolvedValue({ data: { url: 'https://example.com/auth' }, error: null });
  mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
});
it('exchanges the returned PKCE code using the hissa callback', async () => {
  mocks.openAuthSessionAsync.mockResolvedValue({ type: 'success', url: 'hissa://?code=abc' });
  await signInWithGoogle();
  expect(mocks.signInWithOAuth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: 'hissa://', skipBrowserRedirect: true } });
  expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith('abc');
});
it('cancellation never creates a session', async () => {
  mocks.openAuthSessionAsync.mockResolvedValue({ type: 'cancel' });
  await signInWithGoogle();
  expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
});
it('rejects a successful callback without a code', async () => {
  mocks.openAuthSessionAsync.mockResolvedValue({ type: 'success', url: 'hissa://?error=access_denied' });
  await expect(signInWithGoogle()).rejects.toThrow();
  expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
});
