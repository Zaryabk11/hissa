import * as Linking from 'expo-linking';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { clearPendingInvite, getPendingInvite } from '../../../shared/auth/session';
import { useHissaTheme } from '../../../shared/theme/HissaThemeProvider';
import { theme } from '../../../shared/theme';
import {
  ackNudge,
  createInvite,
  endPair,
  getBuddyStatus,
  previewInvite,
  respondInvite,
  sendNudge,
  type BuddyStatus,
} from '../api/buddy';
import { buddyView, httpStatus, normalizeCode } from '../buddy-view';

const REFRESH_MS = 5000;
const OFFLINE = 'Could not reach Hissa. Retrying.';
const RETRY = 'Could not reach Hissa. Try again.';
const DEAD_ANSWER = [400, 404, 409]; // the server says this invitation can no longer be used

function Button({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const t = useHissaTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, { backgroundColor: t.pri }, disabled && styles.disabled]}
    >
      <Text style={[styles.buttonText, { color: t.onPri }]}>{label}</Text>
    </Pressable>
  );
}

export function BuddyPanel() {
  const t = useHissaTheme();
  const params = useLocalSearchParams<{ code?: string }>();
  const [status, setStatus] = useState<BuddyStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [invite, setInvite] = useState<string | null>(null); // a code someone sent me
  const [typed, setTyped] = useState('');
  const [pending, setPending] = useState(false); // a button action is in flight
  const acting = useRef(false);
  const acked = useRef(false);
  const alive = useRef(false); // true only while the tab is focused: gates setState after an await
  const busy = useRef(false); // a status request is in flight; ticks never overlap
  const handled = useRef<string | null>(null); // an answered code is not offered again
  const failed = useRef(new Set<string>()); // codes the server rejected; not re-previewed on focus

  const say = (text: string | null) => {
    if (alive.current) setMessage(text);
  };

  // ponytail: a tick skipped while an action's own refresh is in flight can leave the screen up to 5s stale.
  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const next = await getBuddyStatus();
      if (!alive.current) return;
      setStatus(next);
      setMessage((m) => (m === OFFLINE ? null : m));
      // Without push, an unread nudge is shown once when the app is next open.
      if (!next.unreadNudge) acked.current = false;
      else if (!acked.current) {
        acked.current = true;
        setMessage('Your buddy nudged you to log a meal today.');
        await ackNudge().catch(() => {
          acked.current = false; // retried on the next refresh
        });
      }
    } catch {
      if (alive.current) setMessage(OFFLINE);
    } finally {
      busy.current = false;
    }
  }, []);

  const openInvite = useCallback(async (raw: string | null | undefined) => {
    const code = raw ? normalizeCode(raw) : null;
    if (!code) return setMessage('That is not a valid six-character code.');
    try {
      await previewInvite(code);
      if (!alive.current) return;
      setInvite(code);
      setMessage(null);
    } catch (error) {
      if (!alive.current) return;
      const status = httpStatus(error);
      if (status !== 400 && status !== 404) return setMessage(RETRY); // keep the code to retry
      failed.current.add(code);
      setMessage('That invitation is not valid or has already been used.');
      await clearPendingInvite();
    }
  }, []);

  // Refresh every few seconds while the tab is visible, so a buddy's saved meal shows up quickly.
  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      void refresh();
      void (async () => {
        const code = params.code ?? (await getPendingInvite());
        if (alive.current && code && code !== handled.current && !failed.current.has(code))
          await openInvite(code);
      })();
      const id = setInterval(() => void refresh(), REFRESH_MS);
      return () => {
        alive.current = false;
        clearInterval(id);
      };
    }, [refresh, openInvite, params.code]),
  );

  // Resolves true when the call settled: it worked, or the server said the invitation is dead.
  async function act(run: () => Promise<unknown>, failure: string, dead = [400]): Promise<boolean> {
    if (acting.current) return false;
    acting.current = true;
    setPending(true);
    let settled = true;
    try {
      await run();
      say(null);
    } catch (error) {
      const status = httpStatus(error);
      settled = status !== null && dead.includes(status);
      say(settled ? failure : RETRY);
    }
    acting.current = false;
    setPending(false);
    await refresh();
    return settled;
  }

  async function answer(decision: 'accept' | 'decline') {
    const code = invite;
    if (!code) return;
    const failure = 'That invitation could not be used.';
    if (!(await act(() => respondInvite(code, decision), failure, DEAD_ANSWER))) return;
    handled.current = code;
    setInvite(null); // not gated on alive: leaving the tab mid-request must not bring the card back
    await clearPendingInvite();
  }

  async function share(code: string) {
    await Share.share({
      message: `Join me on Hissa: ${Linking.createURL(`/invite/${code}`)} (code ${code})`,
    });
  }

  const view = status ? buddyView(status) : null;
  return (
    <View>
      {!status && !message && <Text style={[styles.text, { color: t.ink }]}>Loading buddy status…</Text>}
      {message ? (
        <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={[styles.message, { color: t.ink }]}>
          {message}
        </Text>
      ) : null}
      {invite ? (
        <View style={[styles.card, { backgroundColor: t.surf, borderColor: t.hair }]}>
          <Text style={[styles.text, { color: t.ink }]}>You have been invited to be accountability buddies.</Text>
          <Button disabled={pending} label="Accept" onPress={() => void answer('accept')} />
          <Button disabled={pending} label="Decline" onPress={() => void answer('decline')} />
        </View>
      ) : null}
      {view?.kind === 'none' ? (
        <View style={[styles.card, { backgroundColor: t.surf, borderColor: t.hair }]}>
          <Button
            disabled={pending}
            label="Create invite"
            onPress={() => void act(createInvite, 'Could not create an invite.')}
          />
          <TextInput
            accessibilityLabel="Invite code"
            autoCapitalize="characters"
            maxLength={6}
            onChangeText={setTyped}
            placeholder="Enter a code"
            style={[styles.input, { color: t.ink, borderColor: t.hair }]}
            value={typed}
          />
          <Button label="Check code" onPress={() => void openInvite(typed)} />
        </View>
      ) : null}
      {view?.kind === 'pending' ? (
        <View style={[styles.card, { backgroundColor: t.surf, borderColor: t.hair }]}>
          <Text style={[styles.text, { color: t.ink }]}>Your invite code: {view.code}</Text>
          <Button label="Share invite" onPress={() => void share(view.code)} />
          <Button
            disabled={pending}
            label="Cancel invite"
            onPress={() => void act(endPair, 'Could not cancel.')}
          />
        </View>
      ) : null}
      {view?.kind === 'active' ? (
        <View style={[styles.card, { backgroundColor: t.surf, borderColor: t.hair }]}>
          <Text style={[styles.text, { color: t.ink }]}>Shared streak: {view.streak} days</Text>
          <Text style={[styles.text, { color: t.ink }]}>
            You logged today: {view.ownLoggedToday ? 'yes' : 'not yet'}
          </Text>
          <Text style={[styles.text, { color: t.ink }]}>
            Buddy logged today: {view.buddyLoggedToday ? 'yes' : 'not yet'}
          </Text>
          {view.canNudge ? (
            <Button
              disabled={pending}
              label="Nudge buddy"
              onPress={() => void act(sendNudge, 'You can nudge once per day.')}
            />
          ) : null}
          {view.nudgeSent ? <Text style={[styles.text, { color: t.ink }]}>Nudge sent</Text> : null}
          <Button
            disabled={pending}
            label="End pairing"
            onPress={() => void act(endPair, 'Could not end pairing.')}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing.sm, marginBottom: theme.spacing.md, padding: 16, borderWidth: 1, borderRadius: 18 },
  text: { color: theme.colors.text, fontSize: 16 },
  message: { color: theme.colors.muted, marginBottom: theme.spacing.md },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.muted,
    borderRadius: 6,
    padding: theme.spacing.sm,
    color: theme.colors.text,
  },
  button: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    borderRadius: 6,
    backgroundColor: theme.colors.text,
  },
  disabled: { opacity: 0.5 },
  buttonText: { color: theme.colors.background, fontSize: 16 },
});
