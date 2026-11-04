import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useHissaTheme } from '../../../shared/theme/HissaThemeProvider';
import { HissaScreen } from '../../../shared/ui/hissa/HissaScreen';
import { HissaText } from '../../../shared/ui/hissa/HissaText';
import { PrimaryButton } from '../../../shared/ui/hissa/PrimaryButton';
import { Card } from '../../feel/components/Card';
import { nudgeFriend, removeFriend, respondRequest } from '../api/friends';
import { cheer, createGoal, patchGoal } from '../api/goals';
import { socialContent as c } from '../content';
import { groupLine } from '../social-view';
import { useSocialData } from '../useSocialData';
import { AddFriend } from './AddFriend';
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

  // Runs one write, then reloads so the screen shows what the server now says.
  const act = (run: () => Promise<unknown>) => async () => {
    try {
      await run();
      setNotice(null);
    } catch {
      setNotice(c.actionFailed);
    }
    await d.refresh();
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
        style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 22, borderWidth: 1, borderColor: t.hair, backgroundColor: t.surf }}
      >
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

  const { overview, goal, celebrations = [] } = d;
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
        {(notice || d.error) && <HissaText accessibilityRole="alert">{notice ?? c.loadFailed}</HissaText>}
        {line && (
          <Card>
            <HissaText variant="label">{line}</HissaText>
          </Card>
        )}
        {celebrations.map((item) => (
          <CelebrationCard key={`${item.goalId}`} item={item} onCheer={act(() => cheer(item.goalId))} />
        ))}
        {goal?.status === 'active' ? (
          <GoalCard
            goal={goal}
            onShare={act(() => patchGoal({ shared: !goal.shared }))}
            onAbandon={act(() => patchGoal({ abandon: true }))}
          />
        ) : (
          <GoalEditor onCreate={(input) => void act(() => createGoal(input))()} />
        )}
        {overview.friends.length === 0 && <HissaText muted>{c.noFriends}</HissaText>}
        {overview.friends.map((row) => (
          <FriendRow key={row.userId} row={row} onNudge={act(() => nudgeFriend(row.userId))} onRemove={act(() => removeFriend(row.userId))} />
        ))}
        <AddFriend overview={overview} onRespond={(id, dec) => void act(() => respondRequest(id, dec))()} onSent={() => void d.refresh()} />
      </View>
    </HissaScreen>
  );
}
