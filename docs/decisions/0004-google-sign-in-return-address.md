# 0004: Google sign-in through Supabase, with a return address Supabase accepts

**Status:** accepted (2026-11-02). Found by debugging real iPhone sign-ins with the Supabase auth and gateway logs.

**Context:** The app signs in with Supabase Auth (Google provider, PKCE) in a browser sheet (`expo-web-browser`), then exchanges the returned code for a session. Supabase checks the `redirect_to` address the app sends. Three facts, each measured against the live project:

- An address whose host is a bare IP (`exp://192.168.1.5:8081`, which is what Expo Go advertises) is **rejected even when the allow-list pattern `exp://**` would match**. Supabase then redirects to the site URL (`http://localhost:3000`), and the phone shows "Safari can't open the page".
- An address whose host equals the site URL's host is accepted, which is why web (`http://localhost:8081`) works. Hostnames (`exp://my-mac.local:8081`) and custom schemes (`hissa://`) are accepted.
- For a `hissa://` return address Supabase's server sends the user back to `hissa:?code=...` (the slashes are dropped). A check that requires the exact `hissa://` prefix rejects every real callback.

**Decision:**

- The Google OAuth client in Google Cloud is a **Web application** client. An iOS client is only needed for the native Google Sign-In SDK, which this app does not use. Its authorized redirect URI is `https://<project-ref>.supabase.co/auth/v1/callback`.
- `frontend/src/shared/auth/google.ts` returns to `hissa://` on iOS (the iOS sign-in session listens for the scheme of the address it is given, so this works in Expo Go and in builds). Other platforms use `Linking.createURL('')`. After the browser returns, the callback is accepted when its **scheme and host** match the expected address, not the raw string.
- `npm run start` (and `npm run dev:app`) go through `frontend/scripts/start.mjs`, which makes Expo advertise this machine's `.local` hostname instead of its IP, so Android and web dev flows also get an address Supabase accepts.
- Required project settings: Google provider enabled with the client ID and secret, redirect allow-list `hissa://**,exp://**`, a site URL (currently `http://localhost:3000`).

**Consequences:** iOS sign-in does not depend on the network address. Android in Expo Go still needs a hostname the phone can resolve (Android may not resolve `.local`) or a development build or tunnel; this is unverified. Expo Go signs in with PKCE method `plain` because it has no `crypto.subtle`; a polyfill (`expo-crypto`) would restore S256. Only Google accounts on the consent screen's test-user list can sign in while the app is in Testing mode. Never put the Google client secret in the repository; it lives in the Supabase dashboard.
