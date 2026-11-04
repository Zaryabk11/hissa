# Hissa v2 release handoff

Written 2026-11-03 for the project owner. Plan: [v2 Task 10](superpowers/plans/2026-11-02-v2-learning-loop.md). Live status: [v2 status](superpowers/plans/2026-11-02-v2-status.md).

## Deployment gate: HELD

The user has paused deployment. Nothing in this document has been run against Railway, EAS, Vercel or the hosted Supabase project by this task. Until the gate is lifted:

- Do not run `railway up`, `eas build`, `vercel deploy`, or `supabase db push` / any remote migration.
- Do not hand out an APK: any build made now would point at a developer's laptop, not a public API.

Everything below is the prepared plan. Steps marked **owner** need an account or role this repository does not have.

## 1. Prerequisites checklist

- [ ] **Expo/EAS account access (owner).** An Expo account that owns or can create the `hissa` project. The EAS project id is written into `frontend/app.json` by `eas init`; it does not exist yet.
- [ ] **Android package id.** `com.hissa.app` is set in `frontend/app.json` (`android.package`, and the same value for `ios.bundleIdentifier`). It was chosen here, not registered anywhere. Confirm it, or change it before the first build: the id cannot change after the app is installed on devices or published to a store.
- [ ] **Google sign-in return addresses.** In Supabase Auth, URL Configuration, the redirect allow-list must contain `hissa://**` (a build with the `hissa` scheme returns to `hissa://...`; the iOS code returns to `hissa://auth-callback`) and, for Expo Go development, `exp://**`. The Google "Web application" OAuth client keeps its single authorized redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`. **Site URL caveat ([decision 0004](decisions/0004-google-sign-in-return-address.md)):** the site URL is currently `http://localhost:3000`. Supabase falls back to it whenever it rejects a return address, so a failed sign-in on a phone shows "can't open the page". Set the site URL to the landing page's real address when it exists. Google accounts must be on the consent screen's test-user list while the app is in Testing mode.
- [ ] **Supabase migrations, applied in order by an authorized owner.** Hosted project `zvhwzekbgmuaaiepkcwn` has every migration below applied except row 11 (`20261104000100_v3_avoids_recipes.sql`), which is **not applied anywhere yet** (rows 1 to 7 verified 2026-11-02; rows 8 to 10 applied after a remote history repair and verified 2026-11-04).

  | #   | File                                                | State                                                                                                   |
  | --- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
  | 1   | `20261030000000_initial_schema.sql`                 | applied per status doc                                                                                  |
  | 2   | `20261101000000_catalog_and_scan_log.sql`           | applied per status doc                                                                                  |
  | 3   | `20261102000000_profiles_on_signup.sql`             | applied per status doc                                                                                  |
  | 4   | `20261102000100_revoke_handle_new_user_execute.sql` | applied per status doc                                                                                  |
  | 5   | `20261102000200_buddy_invites_and_privacy.sql`      | applied per status doc                                                                                  |
  | 6   | `20261102000300_buddy_nudges.sql`                   | applied per status doc                                                                                  |
  | 7   | `20261102000400_feel_learning.sql`                  | applied per status doc                                                                                  |
  | 8   | `20261102000500_user_experiments.sql`               | applied (verified 2026-11-04)                                                                       |
  | 9   | `20261103000100_meal_delete.sql`                    | applied (verified 2026-11-04)                                                                           |
  | 10  | `20261104000000_friends_goals_notifications.sql`    | applied (verified 2026-11-04; replaces the buddy tables, migrates active buddies to friends)             |
  | 11  | `20261104000100_v3_avoids_recipes.sql`              | **not applied anywhere** (avoid list and recipes; no recipe is served until reviewed)                    |

  Apply with `supabase db push` from `database/` against the linked hosted project, only after the gate is lifted. Re-check with the Supabase dashboard (Database, Migrations) before and after.

- [ ] **Railway owner or editor (owner).** The user's current collaborator role cannot deploy to the intended project. An owner must grant editor, or deploy the prepared settings below.
- [ ] **Gemini API key** for the backend (never the app).

## 2. Railway service settings (monorepo, set in the dashboard)

Do not add `railway.json`; Railway's config-as-code is deprecated for new services, so these are service settings.

| Setting          | Value                                                                                                                                                     |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source           | this GitHub repository, branch the owner chooses (for example `main` after merge)                                                                         |
| Root directory   | repository root (leave empty). The npm workspaces lockfile is at the root, so do not set it to `backend/`                                                 |
| Build command    | `npm ci && npm run build -w backend`                                                                                                                      |
| Start command    | `npm run start -w backend`                                                                                                                                |
| Healthcheck path | `/api/health` (returns `{"status":"ok"}` without auth)                                                                                                    |
| Node             | `engines` in `package.json` is `^22.13.0 \|\| ^24.3.0 \|\| >=26`. Confirm in the build log that the version satisfies it (24 is what it was developed on) |
| Public domain    | generate one; it must be HTTPS                                                                                                                            |

`npm run start -w backend` runs `node --env-file-if-exists=.env dist/server.js`, so no `.env` file is needed on the host. The server listens on `PORT`; Railway injects it.

**Backend variables (names only; values are the owner's):**

| Name                        | Required | Notes                                                              |
| --------------------------- | -------- | ------------------------------------------------------------------ |
| `SUPABASE_URL`              | yes      | must be a URL                                                      |
| `SUPABASE_ANON_KEY`         | yes      |                                                                    |
| `SUPABASE_SERVICE_ROLE_KEY` | yes      | secret; bypasses RLS; server only                                  |
| `GEMINI_API_KEY`            | yes      | secret                                                             |
| `PORT`                      | no       | default 3000; Railway sets it                                      |
| `GEMINI_MODEL`              | no       | default `gemini-flash-lite-latest`; a non-empty value overrides it |
| `GEMINI_TIMEOUT_MS`         | no       | default 10000                                                      |
| `SCAN_DAILY_CAP`            | no       | default 10                                                         |
| `NODE_ENV`                  | no       | `development`, `test` or `production`; set `production`            |

The server refuses to start if a required name is missing (`Invalid environment: <names>`), which shows up as a failed deploy, not a half-working one.

## 3. Post-deploy smoke (once deployed)

Set `API=https://<railway-domain>`.

```
curl -i "$API/api/health"          # expect 200 and {"status":"ok"}
```

The health response is covered by `backend/src/__tests__/app.test.ts`. It has not been run against any deployed URL.

There is **no authenticated smoke script for a remote API**. `database/scripts/smoke-v2-local.mjs` and `smoke-v3-local.mjs` (avoids, recipes, not-for-me; local only) (friends, streak, nudge, goal, notification and check-in checks) deliberately refuses any host other than `localhost` or `127.0.0.1` and creates throwaway users with the service-role key, so do not point it at production. After deploy, verify by hand with two real Google accounts on the test-user list: sign in on both, add each other by username, scan a plate, save the meal, and confirm the streak, a nudge, and a check-in.

## 4. Build the Android APK (after the gate is lifted)

`frontend/eas.json` has one profile, `preview`: Android only, `distribution: internal`, `buildType: apk`. It pulls the `preview` EAS environment variables.

EAS builds do not read `frontend/.env` (it is git-ignored and not uploaded), so the three public values must exist as EAS variables or the APK will crash on start (`Configure the public Supabase URL and anon/publishable key.`) or use `http://localhost:3000`:

```
cd frontend
eas login                                  # owner account
eas init                                   # first time only; writes extra.eas.projectId to app.json
eas env:create --environment preview --name EXPO_PUBLIC_API_URL --value https://<railway-domain> --visibility plaintext
eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value https://<project-ref>.supabase.co --visibility plaintext
eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <anon or publishable key> --visibility plaintext
eas build -p android --profile preview
```

These three are public by design (they are inlined into the app). Never create a variable for the service-role key, and never give `EXPO_PUBLIC_` to a secret. Commit the `projectId` that `eas init` adds.

The finished build page gives an APK download link. Give that link to the partner to put on the landing page (`GET_HISSA_URL` in `frontend/src/features/landing/content.ts` is empty today, so the "Get Hissa" button does nothing). Testers must allow installs from their browser or file manager on the phone.

**Invite link in a build.** The app shares `hissa://invite/<code>` plus the code. The `hissa` scheme in `app.json` is enough: Expo adds the matching Android intent filter and iOS URL type at build time, so no extra `intentFilters` entry was added. https app links would need a domain and a verified `assetlinks.json`, which is not part of this release. Without the app installed the link does nothing; the code works either way.

## 5. Running on devices

### iOS Simulator and iPhone

- Needs a Mac with Xcode (the status doc tested Xcode 26.6) and CocoaPods (`brew install cocoapods`).
- Expo Go (quickest): `npm run dev:app`, press `i`. `hissa://` links do not work in Expo Go; use a development build for them.
- Development build on the Simulator: `cd frontend && npx expo run:ios`. This generates the native `ios/` folder and runs `pod install`; the first run is slow. This repo has no `.gitignore` entry for `ios/` or `android/`: check `git status` and do not commit them.
- Direct to an iPhone: connect it to the Mac, enable Developer Mode on the phone, open the generated Xcode workspace once, choose your free **Personal Team** under Signing, then `npx expo run:ios --device`. A Personal Team install **expires after 7 days** and allows only a few apps; it is for you, not a way to share the app. The phone must reach the API at the Mac's LAN address in `EXPO_PUBLIC_API_URL`.

### Android emulator and device

- Emulator: install Android Studio, create an AVD, and set `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000` (the emulator's name for the host machine).
- Real device: USB debugging on, same Wi-Fi as the Mac, `EXPO_PUBLIC_API_URL` set to the Mac's LAN address.
- Expo Go on Android needs a hostname the phone can resolve (Android may not resolve `.local`). A development build (`npx expo run:android`) or the preview APK avoids that.
- Nothing on Android has been run (see below).

### What was actually tested

| Target                                           | OS / build                                     | What was tested                                                                        | Result                    |
| ------------------------------------------------ | ---------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------- |
| iPhone, Expo Go, local backend + hosted Supabase | iOS version not recorded in the status doc     | Google sign-in, Today, one real Gemini scan that saved a meal (2026-11-03, by hand)    | worked                    |
| iPhone, same setup                               | not recorded                                   | Buddy, invite link, nudge, check-in, weekly card, profile                              | not exercised on a device |
| iOS Simulator, Expo Go                           | Xcode 26.6, iOS 26.5                           | App launches to Sign in; protected tabs stay closed (earlier build, before v2 UI work) | worked; nothing deeper    |
| iOS Simulator, development build                 | none built                                     | `hissa://` invite link                                                                 | not tested                |
| iPhone, Personal Team development build          | none built                                     | anything                                                                               | not tested                |
| Android emulator                                 | none installed (no Android SDK on the dev Mac) | anything                                                                               | not tested                |
| Android real device                              | none                                           | anything                                                                               | not tested                |
| Android preview APK                              | none built (`eas build` not run)               | anything                                                                               | not built                 |
| Web                                              | not recorded                                   | Google sign-in                                                                         | worked per status doc     |

The iPhone Google sign-in worked after the return-address fix in [decision 0004](decisions/0004-google-sign-in-return-address.md).

## 6. Local validation done for this task (2026-11-03, branch `feature/v2-t10-release`)

- `npm test`: frontend 12 files, 73 tests passed; backend 34 files passed (3 skipped), 325 tests passed (13 skipped, the optional Postgres tests).
- `npm run lint`, `npm run build`: pass (exit 0).
- `npm run test:data`: 22 of 22 pass.
- `cd frontend && npx expo config --type public`: parses; shows `scheme: hissa`, `android.package` and `ios.bundleIdentifier` `com.hissa.app`.
- `eas.json`: parsed and resolved by the `@expo/eas-json` package that ships with `eas-cli` 27.4.0 (profile `preview` resolves to `distribution: internal`, `buildType: apk`, `environment: preview`). `eas config` itself was not usable: it needs the EAS project to exist (`eas init`).
- `npx expo-doctor@latest` (1.21.6): 19 of 20 checks pass. The failing check is "packages match the versions required by the installed Expo SDK": `react-native-safe-area-context` 5.10.1 (wants ~5.11.1), `expo` 58.0.21 (wants ~58.0.23), `expo-constants`, `expo-linking`, `expo-router` and `react-native-worklets` one patch behind. Not fixed here: it is a dependency bump that would change the lockfile and needs a device re-test. Run `npx expo install --check` in `frontend/` and re-test before the first build.
- No service-role key in the client: `SERVICE_ROLE` does not appear in `frontend/src`, `frontend/app`, `frontend/scripts`, `app.json` or `eas.json`. `git ls-files | grep -i '\.env$'` is empty (only the two `.env.example` files are tracked). Expo inlines only `EXPO_PUBLIC_*` names, and the local `frontend/.env` has only the three public names.

## 7. Not verified

- Any Android behaviour: install, Google sign-in, camera, invite link, nudges, check-in. An APK has never been built.
- **Android sign-in return address (risk to check first).** `frontend/src/shared/auth/google.ts` uses `hissa://auth-callback` on iOS only; on Android it uses `Linking.createURL('')`, which in an installed build is a bare `hissa://`. Decision 0004 found that form comes back as `hissa:?code=...` with a PKCE code that can fail to exchange. This may break Google sign-in in the APK. If the first APK fails to sign in, the fix is to use `hissa://auth-callback` on every non-web native platform (a change in `frontend/src`, not made here).
- A development build on iOS (`npx expo run:ios`), the `hissa://invite/<code>` link on any device, and the Personal Team install.
- The Feel tab question, weekly pattern card, experiments and profile screens on a physical device; two Google accounts end to end.
- Every Railway step and the EAS variable and build steps: none was run. The Railway root/build/start settings follow Railway's monorepo guidance but were not tried; the build time and Node version Railway picks are unknown.
- Whether the hosted project's allow-list and site URL are still as recorded in decision 0004 (last checked 2026-11-02).
- `android.package` and `ios.bundleIdentifier` `com.hissa.app` are unregistered and unconfirmed.
- `expo-camera` adds the `RECORD_AUDIO` permission by default in the Android manifest (visible in `expo config`); the app never records audio. It can be removed with the plugin option `recordAudioAndroid: false`; not changed here because it was out of scope and untested.

## 8. What only the owner can do

1. Decide when to lift the hold.
2. Confirm or change the package id `com.hissa.app`.
3. Apply migration 8 (and re-check 1 to 7) on the hosted Supabase project; update the redirect allow-list and site URL.
4. Grant Railway editor access or create the service with the section 2 settings and variables, then run the section 3 smoke.
5. Log in to EAS, run `eas init`, create the three `preview` variables with the real API URL, and run the section 4 build.
6. Give the APK link to the partner for the landing page.
