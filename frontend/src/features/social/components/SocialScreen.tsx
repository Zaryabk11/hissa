import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useHissaTheme } from '../../../shared/theme/HissaThemeProvider';
import { Card as StickerCard } from '../../../shared/ui/hissa/Card';
import { HissaScreen } from '../../../shared/ui/hissa/HissaScreen';
import { HissaText } from '../../../shared/ui/hissa/HissaText';
import { PrimaryButton } from '../../../shared/ui/hissa/PrimaryButton';
import { Card } from '../../feel/components/Card';
import { ApiError } from '../../../shared/api/client';
import { cheerStreak, nudgeFriend, removeFriend, respondRequest } from '../api/friends';
import { cheer, createGoal, patchGoal } from '../api/goals';
import { socialContent as c } from '../content';
import { groupLine } from '../social-view';
import { useSocialData } from '../useSocialData';
import { AddFriend } from './AddFriend';
import { BuddyCard } from './BuddyCard';
import { CelebrationCard } from './CelebrationCard';
import { FriendRow } from './FriendRow';
import { GoalCard } from './GoalCard';
import { GoalEditor } from './GoalEditor';
import { UsernamePrompt } from './UsernamePrompt';

export function SocialScreen() {
  const router = useRouter();
  const t = useHissaTheme();
  const d = useSocialData();
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false); // synchronous guard: state alone lets a fast double tap through

  // Runs one write, then reloads so the screen shows what the server now says.
  const act = (run: () => Promise<unknown>, onConflict?: string) => async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await run();
      setNotice(null);
    } catch (e) {
      setNotice(onConflict && e instanceof ApiError && e.status === 409 ? onConflict : c.actionFailed);
    }
    try {
      await d.refresh();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const header = (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
      <HissaText variant="title" accessibilityRole="header">
        {c.title}
      </HissaText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={c.inbox.open}
        onPress={() => router.push('/inbox')}
        style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, borderRadius: 22, borderWidth: 2, borderColor: t.line, backgroundColor: t.surf2 }}
      >
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={t.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0" />
        </Svg>
        <HissaText variant="button">{c.inbox.open}</HissaText>
      </Pressable>
    </View>
  );

  if (d.username === undefined)
    return (
      <HissaScreen>
        {header}
        {d.error ? (
          <>
            <HissaText accessibilityRole="alert">{c.loadFailed}</HissaText>
            <View style={{ marginTop: 16 }}>
              <PrimaryButton label={c.retry} onPress={() => void d.refresh()} />
            </View>
          </>
        ) : (
          <HissaText muted accessibilityRole="progressbar">
            {c.loading}
          </HissaText>
        )}
      </HissaScreen>
    );

  if (d.username === null || !d.overview)
    return (
      <HissaScreen>
        {header}
        <UsernamePrompt onSaved={() => void d.refresh()} />
      </HissaScreen>
    );

  const { overview, goal, celebrations = [], friendGoals = [] } = d;
  const line = groupLine(overview.loggedCount, overview.friends.length);

  return (
    <HissaScreen
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        void d.refresh().finally(() => setRefreshing(false));
      }}
    >
      {header}
      <View style={{ gap: 12 }}>
        <BuddyCard username={d.username} friend={overview.friends[0]} />
        {(notice || d.error) && <HissaText accessibilityRole="alert">{notice ?? c.loadFailed}</HissaText>}
        {line && (
          <StickerCard tone="turt">
            <HissaText variant="label">{line}</HissaText>
          </StickerCard>
        )}
        {celebrations.map((item) => (
          <CelebrationCard key={`${item.goalId}`} item={item} busy={busy} onCheer={act(() => cheer(item.goalId))} />
        ))}
        {goal?.status === 'active' ? (
          <GoalCard
            goal={goal}
            busy={busy}
            onShare={act(() => patchGoal({ shared: !goal.shared }))}
            onAbandon={act(() => patchGoal({ abandon: true }))}
          />
        ) : (
          <>
            {goal?.status === 'reached' && <HissaText variant="label">{c.goal.reached(goal.title)}</HissaText>}
            <GoalEditor busy={busy} onCreate={(input) => void act(() => createGoal(input))()} />
          </>
        )}
        <Card gap={0}>
          <HissaText variant="label" accessibilityRole="header">
            {c.friends}
          </HissaText>
          {overview.friends.length === 0 && (
            <HissaText muted style={{ marginTop: 8 }}>
              {c.noFriends}
            </HissaText>
          )}
          {overview.friends.map((row, i) => (
            <View key={row.userId} style={i > 0 ? { borderTopWidth: 1, borderTopColor: t.hair } : { marginTop: 4 }}>
              <FriendRow row={row} goal={friendGoals.find((g) => g.userId === row.userId)} busy={busy} onNudge={act(() => nudgeFriend(row.userId))} onCheerStreak={act(() => cheerStreak(row.userId), c.alreadyCheered)} onRemove={act(() => removeFriend(row.userId))} />
            </View>
          ))}
        </Card>
        <AddFriend overview={overview} busy={busy} onRespond={(id, dec) => void act(() => respondRequest(id, dec))()} onSent={() => void d.refresh()} />
      </View>
    </HissaScreen>
  );
}
