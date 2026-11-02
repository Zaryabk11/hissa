import * as Linking from 'expo-linking';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { clearPendingInvite, getPendingInvite } from '../../../shared/auth/session';
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
import { buddyView, normalizeCode } from '../buddy-view';

const REFRESH_MS = 5000;

function Button({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.button}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export function BuddyPanel() {
  const params = useLocalSearchParams<{ code?: string }>();
  const [status, setStatus] = useState<BuddyStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [invite, setInvite] = useState<string | null>(null); // a code someone sent me
  const [typed, setTyped] = useState('');
  const acked = useRef(false);
  const handled = useRef<string | null>(null); // an answered code is not offered again

  const refresh = useCallback(async () => {
    try {
      const next = await getBuddyStatus();
      setStatus(next);
      // Without push, an unread nudge is shown once when the app is next open.
      if (next.unreadNudge && !acked.current) {
        acked.current = true;
        setMessage('Your buddy nudged you to log a meal today.');
        await ackNudge();
      }
    } catch {
      setMessage('Could not reach Hissa. Retrying.');
    }
  }, []);

  const openInvite = useCallback(async (raw: string | null | undefined) => {
    const code = raw ? normalizeCode(raw) : null;
    if (!code) return setMessage('That is not a valid six-character code.');
    try {
      await previewInvite(code);
      setInvite(code);
      setMessage(null);
    } catch {
      setMessage('That invitation is not valid or has already been used.');
      await clearPendingInvite();
    }
  }, []);

  // Refresh every few seconds while the tab is visible, so a buddy's saved meal shows up quickly.
  useFocusEffect(
    useCallback(() => {
      void refresh();
      void (async () => {
        const code = params.code ?? (await getPendingInvite());
        if (code && code !== handled.current) await openInvite(code);
      })();
      const id = setInterval(() => void refresh(), REFRESH_MS);
      return () => clearInterval(id);
    }, [refresh, openInvite, params.code]),
  );

  async function act(run: () => Promise<unknown>, failure: string) {
    try {
      await run();
      setMessage(null);
    } catch {
      setMessage(failure);
    }
    await refresh();
  }

  async function answer(decision: 'accept' | 'decline') {
    if (!invite) return;
    handled.current = invite;
    await act(() => respondInvite(invite, decision), 'That invitation could not be used.');
    await clearPendingInvite();
    setInvite(null);
  }

  async function share(code: string) {
    await Share.share({
      message: `Join me on Hissa: ${Linking.createURL(`/invite/${code}`)} (code ${code})`,
    });
  }

  const view = status ? buddyView(status) : null;
  return (
    <View>
      {message ? (
        <Text accessibilityLiveRegion="polite" style={styles.message}>
          {message}
        </Text>
      ) : null}
      {invite ? (
        <View style={styles.card}>
          <Text style={styles.text}>You have been invited to be accountability buddies.</Text>
          <Button label="Accept" onPress={() => void answer('accept')} />
          <Button label="Decline" onPress={() => void answer('decline')} />
        </View>
      ) : null}
      {view?.kind === 'none' ? (
        <View style={styles.card}>
          <Button
            label="Create invite"
            onPress={() => void act(createInvite, 'Could not create an invite.')}
          />
          <TextInput
            accessibilityLabel="Invite code"
            autoCapitalize="characters"
            maxLength={6}
            onChangeText={setTyped}
            placeholder="Enter a code"
            style={styles.input}
            value={typed}
          />
          <Button label="Check code" onPress={() => void openInvite(typed)} />
        </View>
      ) : null}
      {view?.kind === 'pending' ? (
        <View style={styles.card}>
          <Text style={styles.text}>Your invite code: {view.code}</Text>
          <Button label="Share invite" onPress={() => void share(view.code)} />
          <Button label="Cancel invite" onPress={() => void act(endPair, 'Could not cancel.')} />
        </View>
      ) : null}
      {view?.kind === 'active' ? (
        <View style={styles.card}>
          <Text style={styles.text}>Shared streak: {view.streak} days</Text>
          <Text style={styles.text}>
            You logged today: {view.ownLoggedToday ? 'yes' : 'not yet'}
          </Text>
          <Text style={styles.text}>
            Buddy logged today: {view.buddyLoggedToday ? 'yes' : 'not yet'}
          </Text>
          {view.canNudge ? (
            <Button
              label="Nudge buddy"
              onPress={() => void act(sendNudge, 'You can nudge once per day.')}
            />
          ) : null}
          <Button label="End pairing" onPress={() => void act(endPair, 'Could not end pairing.')} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing.sm, marginBottom: theme.spacing.md },
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
  buttonText: { color: theme.colors.background, fontSize: 16 },
});
