import * as Linking from 'expo-linking';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Platform, Share, TextInput, View } from 'react-native';
import { clearPendingInvite, getPendingInvite } from '../../../shared/auth/session';
import { useHissaTheme } from '../../../shared/theme/HissaThemeProvider';
import { hissaFonts, hissaRadii } from '../../../shared/theme/hissaTokens';
import { HissaText } from '../../../shared/ui/hissa/HissaText';
import { PrimaryButton } from '../../../shared/ui/hissa/PrimaryButton';
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
import { buddyView, daysLabel, httpStatus, normalizeCode, togetherLine } from '../buddy-view';
import { buddyContent as c } from '../content';
import { BuddySkeleton, Card, LoggedRow } from './parts';

const REFRESH_MS = 5000;
const DEAD_ANSWER = [400, 404, 409]; // the server says this invitation can no longer be used

export function BuddyPanel() {
  const t = useHissaTheme();
  const params = useLocalSearchParams<{ code?: string }>();
  const [status, setStatus] = useState<BuddyStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [invite, setInvite] = useState<string | null>(null); // a code someone sent me
  const [typed, setTyped] = useState('');
  const [pending, setPending] = useState(false); // a button action is in flight
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [copied, setCopied] = useState(false);
  const acting = useRef(false);
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
      setMessage((m) => (m === c.offline ? null : m));
    } catch {
      if (alive.current) setMessage(c.offline);
    } finally {
      busy.current = false;
    }
  }, []);

  const openInvite = useCallback(async (raw: string | null | undefined) => {
    const code = raw ? normalizeCode(raw) : null;
    if (!code) return setMessage(c.invalidCode);
    try {
      await previewInvite(code);
      if (!alive.current) return;
      setInvite(code);
      setMessage(null);
    } catch (error) {
      if (!alive.current) return;
      const status = httpStatus(error);
      if (status !== 400 && status !== 404) return setMessage(c.retry); // keep the code to retry
      failed.current.add(code);
      setMessage(c.deadInvite);
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
      say(settled ? failure : c.retry);
    }
    acting.current = false;
    setPending(false);
    await refresh();
    return settled;
  }

  async function answer(decision: 'accept' | 'decline') {
    const code = invite;
    if (!code) return;
    if (!(await act(() => respondInvite(code, decision), c.invite.failed, DEAD_ANSWER))) return;
    handled.current = code;
    setInvite(null); // not gated on alive: leaving the tab mid-request must not bring the card back
    await clearPendingInvite();
  }

  async function share(code: string) {
    try {
      await Share.share({
        message: `Join me on Hissa: ${Linking.createURL(`/invite/${code}`)} (code ${code})`,
      });
    } catch {
      // The share sheet is unavailable or failed; the code is still on screen.
    }
  }

  // Web only: native has no clipboard module installed, and its share sheet already offers Copy.
  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the code is selectable on screen.
    }
  }

  async function endPairing() {
    await act(endPair, c.paired.endFailed);
    setConfirmEnd(false);
  }

  const view = status ? buddyView(status) : null;
  const loadFailed = !status && message === c.offline;
  const notice = message && !loadFailed ? message : null;

  return (
    <View style={{ gap: 16 }}>
      {!status && !loadFailed && <BuddySkeleton />}
      {loadFailed && (
        <Card>
          <HissaText accessibilityRole="alert" accessibilityLiveRegion="polite">
            {c.loadFailed}
          </HissaText>
          <PrimaryButton label={c.tryAgain} onPress={() => void refresh()} />
        </Card>
      )}
      {notice && (
        <Card>
          <HissaText accessibilityRole="alert" accessibilityLiveRegion="polite">
            {notice}
          </HissaText>
        </Card>
      )}
      {view?.kind === 'active' && view.unreadNudge && (
        <Card tint>
          <HissaText accessibilityLiveRegion="polite" style={{ color: t.tintInk }}>
            {c.paired.nudged}
          </HissaText>
          <PrimaryButton
            disabled={pending}
            label={c.paired.gotIt}
            onPress={() => void act(ackNudge, c.retry)}
          />
        </Card>
      )}
      {invite && (
        <Card>
          <HissaText variant="title" accessibilityRole="header">
            {c.invite.title}
          </HissaText>
          <HissaText muted>{c.invite.body}</HissaText>
          <CodeText code={invite} />
          <PrimaryButton
            disabled={pending}
            label={c.invite.accept}
            onPress={() => void answer('accept')}
          />
          <PrimaryButton
            outline
            disabled={pending}
            label={c.invite.decline}
            onPress={() => void answer('decline')}
          />
        </Card>
      )}
      {view?.kind === 'none' && (
        <Card>
          <HissaText variant="title" accessibilityRole="header">
            {c.unpaired.title}
          </HissaText>
          <HissaText muted>{c.unpaired.body}</HissaText>
          <PrimaryButton
            disabled={pending}
            label={c.unpaired.create}
            onPress={() => void act(createInvite, c.unpaired.createFailed)}
          />
          <HissaText variant="label" style={{ marginTop: 8 }}>
            {c.unpaired.haveCode}
          </HissaText>
          <TextInput
            accessibilityLabel={c.unpaired.codeLabel}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            onChangeText={setTyped}
            onSubmitEditing={() => void openInvite(typed)}
            placeholder={c.unpaired.codePlaceholder}
            placeholderTextColor={t.muted}
            style={{
              minHeight: 48,
              paddingHorizontal: 16,
              borderRadius: hissaRadii.control,
              borderWidth: 1,
              borderColor: t.hair,
              backgroundColor: t.bg,
              color: t.ink,
              fontFamily: hissaFonts.body400,
              fontSize: 16,
            }}
            value={typed}
          />
          <PrimaryButton
            outline
            disabled={!normalizeCode(typed)}
            label={c.unpaired.check}
            onPress={() => void openInvite(typed)}
          />
        </Card>
      )}
      {view?.kind === 'pending' && (
        <Card>
          <HissaText variant="title" accessibilityRole="header">
            {c.pending.title}
          </HissaText>
          <CodeText code={view.code} />
          <HissaText variant="caption">{c.pending.body}</HissaText>
          {Platform.OS === 'web' && (
            <PrimaryButton
              outline
              label={copied ? c.pending.copied : c.pending.copy}
              onPress={() => void copy(view.code)}
            />
          )}
          <PrimaryButton label={c.pending.share} onPress={() => void share(view.code)} />
          <PrimaryButton
            outline
            disabled={pending}
            label={c.pending.cancel}
            onPress={() => void act(endPair, c.pending.cancelFailed)}
          />
        </Card>
      )}
      {view?.kind === 'active' && (
        <>
          <Card>
            <View
              accessible
              accessibilityLabel={`${view.streak} ${daysLabel(view.streak)}`}
              style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}
            >
              <HissaText variant="hero">{view.streak}</HissaText>
              <HissaText variant="button" muted>
                {daysLabel(view.streak)}
              </HissaText>
            </View>
            <HissaText muted>{togetherLine(view.ownLoggedToday, view.buddyLoggedToday)}</HissaText>
            <View style={{ height: 1, backgroundColor: t.hair }} />
            <LoggedRow who={c.paired.you} logged={view.ownLoggedToday} />
            <LoggedRow who={c.paired.buddy} logged={view.buddyLoggedToday} />
          </Card>
          {view.canNudge && (
            <PrimaryButton
              disabled={pending}
              label={c.paired.nudge}
              onPress={() => void act(sendNudge, c.paired.nudgeFailed)}
            />
          )}
          {view.nudgeSent && (
            <PrimaryButton disabled label={c.paired.nudgeSent} onPress={() => undefined} />
          )}
          <HissaText variant="caption" style={{ textAlign: 'center' }}>
            {c.paired.privacy}
          </HissaText>
          {confirmEnd ? (
            <Card>
              <HissaText variant="label" accessibilityRole="header">
                {c.paired.endTitle}
              </HissaText>
              <HissaText muted>{c.paired.endBody}</HissaText>
              <PrimaryButton
                disabled={pending}
                label={c.paired.endConfirm}
                onPress={() => void endPairing()}
              />
              <PrimaryButton
                outline
                disabled={pending}
                label={c.paired.endKeep}
                onPress={() => setConfirmEnd(false)}
              />
            </Card>
          ) : (
            <PrimaryButton outline label={c.paired.end} onPress={() => setConfirmEnd(true)} />
          )}
        </>
      )}
    </View>
  );
}

function CodeText({ code }: { code: string }) {
  return (
    <HissaText
      selectable
      accessibilityLabel={`Code ${code.split('').join(' ')}`}
      variant="hero"
      style={{ fontSize: 40, lineHeight: 48, letterSpacing: 6 }}
    >
      {code}
    </HissaText>
  );
}
