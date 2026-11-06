import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ApiError } from '../../shared/api/client';
import { useHissaTheme } from '../../shared/theme/HissaThemeProvider';
import { Card } from '../../shared/ui/hissa/Card';
import { Dabbu } from '../../shared/ui/hissa/Dabbu';
import { useIrisNavigate } from '../../shared/ui/hissa/IrisTransition';
import { Segmented } from '../../shared/ui/hissa/Segmented';
import { SpeechBubble } from '../../shared/ui/hissa/SpeechBubble';
import { HissaScreen } from '../../shared/ui/hissa/HissaScreen';
import { HissaText } from '../../shared/ui/hissa/HissaText';
import { PrimaryButton } from '../../shared/ui/hissa/PrimaryButton';
import { getCatalog, getProfile, getToday, type Profile, type Today } from '../core/api';
import { getDueCheckin, type DueCheckin } from '../feel/api/feel';
import { getMyStreak } from '../social/api/profile';
import { dishById, setCatalog } from '../nutrition/catalog';
import { portionText } from '../nutrition/engine';
import { BudgetRing } from './components/BudgetRing';
import { WeekCard } from './components/WeekCard';
import { TodayRecipes } from '../recipes/components/TodayRecipes';
import { TodaySkeleton } from './components/Skeleton';
import { todayContent as c } from './content';
import { dayLabel } from './format';
import { macroRows, ringView, streakCard, type StreakStatus } from './today-view';

type Loaded = { profile: Profile; today: Today; streak: StreakStatus | null; due: DueCheckin };

const fetchAll = () =>
  Promise.all([
    getProfile(),
    getCatalog(),
    getToday(),
    getMyStreak().catch(() => null),
    getDueCheckin().catch(() => null),
  ]);

function Tap({ children, onPress, label }: { children: React.ReactNode; onPress: () => void; label: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ minHeight: 44 }}>
      <Card style={{ gap: 4 }}>{children}</Card>
    </Pressable>
  );
}

export function TodayScreen() {
  const router = useRouter();
  const iris = useIrisNavigate();
  const [view, setView] = useState<'day' | 'week'>('day');
  const t = useHissaTheme();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [weekKey, setWeekKey] = useState(0);
  const hasData = useRef(false);

  const load = useCallback(
    (live: () => boolean) =>
      fetchAll()
        .then(([profile, catalog, today, streak, due]) => {
          if (!live()) return;
          setCatalog(catalog.dishes);
          hasData.current = true;
          setLoaded({ profile, today, streak, due });
          setNotice(null);
        })
        .catch((cause) => {
          if (!live()) return;
          if (
            cause instanceof ApiError &&
            cause.status === 404 &&
            cause.path === '/api/profiles/me'
          )
            router.replace('/onboarding/goal');
          // Keep what is on screen when only a refresh fails.
          else if (hasData.current) setNotice(c.refresh.failed);
          else setError(c.loadError);
        }),
    [router],
  );

  // Focus reloads quietly: the skeleton shows only while there is nothing to show yet.
  useFocusEffect(
    useCallback(() => {
      void retry;
      let live = true;
      void load(() => live);
      return () => {
        live = false;
      };
    }, [retry, load]),
  );

  const refresh = () => {
    setRefreshing(true);
    setWeekKey((n) => n + 1);
    void load(() => true).finally(() => setRefreshing(false));
  };

  if (error)
    return (
      <HissaScreen>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 24 }}>
          <Dabbu mood="oops" size={88} />
          <SpeechBubble>
            <HissaText accessibilityRole="alert" variant="label">
              {error}
            </HissaText>
          </SpeechBubble>
        </View>
        <View style={{ marginTop: 24 }}>
          <PrimaryButton
            label={c.retry}
            onPress={() => {
              setError(null);
              setRetry((n) => n + 1);
            }}
          />
        </View>
      </HissaScreen>
    );
  if (!loaded) return <TodaySkeleton />;

  const { profile, today, streak, due } = loaded;
  const empty = today.meals.length === 0;
  const ring = ringView(profile.dailyCalorieBudget, today.totalCalories, empty);
  const card = streakCard(streak);
  const macros = macroRows(today.macros, {
    proteinG: profile.proteinTargetG,
    carbsG: profile.carbsTargetG,
    fatG: profile.fatTargetG,
  });
  const bubble = empty ? `${c.empty.title}. ${c.empty.body}` : ring.atBudget ? c.ring.atBudget : c.ring.next;
  const shown = ring.shown.toLocaleString('en-US');

  return (
    <HissaScreen onRefresh={refresh} refreshing={refreshing}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <HissaText variant="caption">{dayLabel(today.day)}</HissaText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={c.profile}
          onPress={() => router.push('/profile')}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: t.surf,
            borderWidth: 2,
            borderColor: t.line,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <HissaText variant="label">
            {(profile.displayName?.trim()[0] ?? 'H').toUpperCase()}
          </HissaText>
        </Pressable>
      </View>
      <HissaText variant="title" accessibilityRole="header" style={{ marginTop: 4 }}>
        {c.greeting(profile.displayName)}
      </HissaText>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
        <Dabbu mood={empty ? 'wave' : ring.atBudget ? 'content' : 'idle'} size={88} />
        <SpeechBubble>{bubble}</SpeechBubble>
      </View>
      {notice && (
        <HissaText accessibilityRole="alert" muted style={{ marginTop: 8 }}>
          {notice}
        </HissaText>
      )}
      <View style={{ marginTop: 16 }}>
        <Segmented
          options={[
            { value: 'day', label: c.view.day },
            { value: 'week', label: c.view.week },
          ]}
          value={view}
          onChange={setView}
        />
      </View>

      {due && (
        <View style={{ marginTop: 20 }}>
          <Tap onPress={() => router.push('/(tabs)/feel')} label={`${c.checkin.title} ${c.checkin.cta}`}>
            <HissaText variant="label">{c.checkin.title}</HissaText>
            <HissaText variant="caption">{c.checkin.body}</HissaText>
          </Tap>
        </View>
      )}

      {view === 'week' ? (
        <View style={{ marginTop: 20 }}>
          <WeekCard budget={profile.dailyCalorieBudget} refreshKey={weekKey} />
        </View>
      ) : (
        <>
          <View style={{ alignItems: 'center', marginTop: 24 }}>
            <BudgetRing fraction={ring.fraction} label={c.ring.label(shown, ring.caption)}>
              <HissaText variant="caption">{c.ring.about}</HissaText>
              <HissaText variant="hero">{shown}</HissaText>
              <HissaText variant="button">{`kcal ${ring.caption}`}</HissaText>
              <HissaText variant="caption">{c.ring.estimate}</HissaText>
            </BudgetRing>
          </View>

          {macros && (
            <View style={{ marginTop: 20 }}>
              <Card>
                <HissaText variant="label">{`${c.macros.title} (${c.macros.estimate})`}</HissaText>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  {macros.map((m) => (
                    <View key={m.label} accessible accessibilityLabel={`${m.label}: about ${m.text}, an estimate`}>
                      <HissaText variant="caption">{m.label}</HissaText>
                      <HissaText variant="button">{m.text}</HissaText>
                    </View>
                  ))}
                </View>
              </Card>
            </View>
          )}

          {empty ? (
            <View style={{ marginTop: 24 }}>
              <Card tone="surf2" style={{ alignItems: 'center', gap: 12 }}>
                <HissaText variant="label" accessibilityRole="header">
                  {c.empty.title}
                </HissaText>
                <HissaText muted style={{ textAlign: 'center' }}>
                  {c.empty.body}
                </HissaText>
                <View style={{ alignSelf: 'stretch' }}>
                  <PrimaryButton label={c.empty.cta} onPress={() => iris.push('/(tabs)/scan')} />
                </View>
              </Card>
            </View>
          ) : (
            <View style={{ marginTop: 24, gap: 12 }}>
              <HissaText variant="label" accessibilityRole="header">
                {c.meals.title}
              </HissaText>
              {today.meals.map((meal) => {
                const confirmed = meal.items.filter(
                  (item) => item.confirmedDish && item.confirmedPortion,
                );
                const names = confirmed
                  .map((item) => dishById(item.confirmedDish!)?.name ?? item.confirmedDish)
                  .join(', ');
                return (
                  <Card key={meal.id} style={{ gap: 4 }}>
                    <HissaText variant="label">{names}</HissaText>
                    <HissaText variant="caption">
                      {new Date(meal.eatenAt).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </HissaText>
                    {confirmed.map((item, i) => (
                      <HissaText key={i} muted>
                        {portionText({ dishId: item.confirmedDish!, qty: item.confirmedPortion! })}{' '}
                        {dishById(item.confirmedDish!)?.name ?? item.confirmedDish}
                      </HissaText>
                    ))}
                    <HissaText variant="caption">
                      {c.meals.kcal(Math.round(meal.totalCalories).toLocaleString('en-US'))}
                    </HissaText>
                  </Card>
                );
              })}
            </View>
          )}
        </>
      )}

      <TodayRecipes refreshKey={weekKey} />

      {card.kind === 'streak' && (
        <View style={{ marginTop: 20 }}>
          <Tap onPress={() => router.push('/(tabs)/social')} label={c.streak.open}>
            <HissaText variant="label">{c.streak.days(card.streak)}</HissaText>
            <HissaText variant="caption">{card.loggedToday ? c.streak.logged : c.streak.notYet}</HissaText>
          </Tap>
        </View>
      )}
    </HissaScreen>
  );
}
