import { beforeEach, expect, it, vi } from 'vitest';
import { signInWithGoogle } from './google';

const mocks = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  openAuthSessionAsync: vi.fn(),
  createURL: vi.fn(),
  os: vi.fn(),
}));
vi.mock('expo-linking', () => ({ createURL: mocks.createURL }));
vi.mock('react-native', () => ({
  Platform: {
    get OS() {
      return mocks.os();
    },
  },
}));
vi.mock('./supabase', () => ({ supabase: { auth: mocks } }));
vi.mock('expo-web-browser', () => ({
  openAuthSessionAsync: mocks.openAuthSessionAsync,
  maybeCompleteAuthSession: vi.fn(),
}));
beforeEach(() => {
  vi.resetAllMocks();
  mocks.createURL.mockReturnValue('hissa://');
  mocks.os.mockReturnValue('android');
  mocks.signInWithOAuth.mockResolvedValue({
    data: { url: 'https://example.com/auth' },
    error: null,
  });
  mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
});
it('exchanges the returned PKCE code using the hissa callback', async () => {
  mocks.openAuthSessionAsync.mockResolvedValue({ type: 'success', url: 'hissa://?code=abc' });
  await signInWithGoogle();
  expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
    provider: 'google',
    options: { redirectTo: 'hissa://', skipBrowserRedirect: true },
  });
  expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith('abc');
});
it('cancellation never creates a session', async () => {
  mocks.openAuthSessionAsync.mockResolvedValue({ type: 'cancel' });
  await signInWithGoogle();
  expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
});
it('rejects a successful callback without a code', async () => {
  mocks.openAuthSessionAsync.mockResolvedValue({
    type: 'success',
    url: 'hissa://?error=access_denied',
  });
  await expect(signInWithGoogle()).rejects.toThrow();
  expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
});
it('uses the Expo-provided return address on Android so Expo Go catches it', async () => {
  const expoGo = 'exp://192.168.1.2:8081/--/';
  mocks.createURL.mockReturnValue(expoGo);
  mocks.openAuthSessionAsync.mockResolvedValue({ type: 'success', url: `${expoGo}?code=xyz` });
  await signInWithGoogle();
  expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
    provider: 'google',
    options: { redirectTo: expoGo, skipBrowserRedirect: true },
  });
  expect(mocks.openAuthSessionAsync).toHaveBeenCalledWith('https://example.com/auth', expoGo);
  expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith('xyz');
});
it('rejects a callback that does not return to our own address', async () => {
  mocks.openAuthSessionAsync.mockResolvedValue({ type: 'success', url: 'evil://?code=abc' });
  await expect(signInWithGoogle()).rejects.toThrow();
  expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
});
it("always returns to hissa:// on iOS, because Supabase rejects an IP-address host such as Expo Go's exp://192.168.x.x", async () => {
  mocks.os.mockReturnValue('ios');
  mocks.createURL.mockReturnValue('exp://192.168.1.5:8081');
  mocks.openAuthSessionAsync.mockResolvedValue({ type: 'success', url: 'hissa://?code=abc' });
  await signInWithGoogle();
  expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
    provider: 'google',
    options: { redirectTo: 'hissa://', skipBrowserRedirect: true },
  });
  expect(mocks.openAuthSessionAsync).toHaveBeenCalledWith('https://example.com/auth', 'hissa://');
  expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith('abc');
});
