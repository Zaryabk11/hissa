import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ApiError } from '../../shared/api/client';
import { useHissaTheme } from '../../shared/theme/HissaThemeProvider';
import { HissaScreen } from '../../shared/ui/hissa/HissaScreen';
import { HissaText } from '../../shared/ui/hissa/HissaText';
import { PrimaryButton } from '../../shared/ui/hissa/PrimaryButton';
import { getBuddyStatus, sendNudge, type BuddyStatus } from '../buddy/api/buddy';
import { getCatalog, getProfile, getToday, type Profile, type Today } from '../core/api';
import { getDueCheckin, type DueCheckin } from '../feel/api/feel';
import { dishById, setCatalog } from '../nutrition/catalog';
import { portionText } from '../nutrition/engine';
import { BudgetRing } from './components/BudgetRing';
import { WeekCard } from './components/WeekCard';
import { TodayRecipes } from '../recipes/components/TodayRecipes';
import { TodaySkeleton } from './components/Skeleton';
import { todayContent as c } from './content';
import { dayLabel } from './format';
import { buddyCard, ringView } from './today-view';

type Loaded = { profile: Profile; today: Today; buddy: BuddyStatus | null; due: DueCheckin };

const fetchAll = () =>
  Promise.all([
    getProfile(),
    getCatalog(),
    getToday(),
    getBuddyStatus().catch(() => null),
    getDueCheckin().catch(() => null),
  ]);

function Card({
  children,
  onPress,
  label,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  label?: string;
}) {
  const t = useHissaTheme();
  const style = {
    padding: 16,
    borderRadius: 18,
    backgroundColor: t.surf,
    borderWidth: 1,
    borderColor: t.hair,
    gap: 4,
  } as const;
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={style}
    >
      {children}
    </Pressable>
  ) : (
    <View style={style}>{children}</View>
  );
}

export function TodayScreen() {
  const router = useRouter();
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
        .then(([profile, catalog, today, buddy, due]) => {
          if (!live()) return;
          setCatalog(catalog.dishes);
          hasData.current = true;
          setLoaded({ profile, today, buddy, due });
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

  const nudge = () => {
    sendNudge()
      .then(() =>
        setLoaded((l) => l && l.buddy && { ...l, buddy: { ...l.buddy, nudgedToday: true } }),
      )
      .catch(() => setNotice(c.streak.nudgeError));
  };

  if (error)
    return (
      <HissaScreen>
        <HissaText accessibilityRole="alert">{error}</HissaText>
        <View style={{ marginTop: 16 }}>
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

  const { profile, today, buddy, due } = loaded;
  const empty = today.meals.length === 0;
  const ring = ringView(profile.dailyCalorieBudget, today.totalCalories, empty);
  const card = buddyCard(buddy);
  const buddyName = c.streak.buddyFallback;

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
            borderWidth: 1,
            borderColor: t.hair,
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
      {notice && (
        <HissaText accessibilityRole="alert" muted style={{ marginTop: 8 }}>
          {notice}
        </HissaText>
      )}
      <View style={{ alignItems: 'center', marginTop: 24 }}>
        <BudgetRing
          fraction={ring.fraction}
          label={c.ring.label(ring.shown.toLocaleString('en-US'), ring.caption)}
        >
          <HissaText variant="hero">{ring.shown.toLocaleString('en-US')}</HissaText>
          <HissaText variant="button">{ring.caption}</HissaText>
          <HissaText variant="caption">{c.ring.estimate}</HissaText>
        </BudgetRing>
      </View>
      {ring.atBudget && (
        <HissaText style={{ marginTop: 16, textAlign: 'center' }}>{c.ring.atBudget}</HissaText>
      )}

      {due && (
        <View style={{ marginTop: 20 }}>
          <Card
            onPress={() => router.push('/(tabs)/feel')}
            label={`${c.checkin.title} ${c.checkin.cta}`}
          >
            <HissaText variant="label">{c.checkin.title}</HissaText>
            <HissaText variant="caption">{c.checkin.body}</HissaText>
          </Card>
        </View>
      )}

      {empty ? (
        <View
          style={{
            marginTop: 28,
            padding: 24,
            borderRadius: 24,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: t.rim,
            alignItems: 'center',
            gap: 12,
          }}
        >
          <HissaText variant="title" accessibilityRole="header">
            {c.empty.title}
          </HissaText>
          <HissaText muted style={{ textAlign: 'center' }}>
            {c.empty.body}
          </HissaText>
          <View style={{ alignSelf: 'stretch' }}>
            <PrimaryButton label={c.empty.cta} onPress={() => router.push('/(tabs)/scan')} />
          </View>
        </View>
      ) : (
        <View style={{ marginTop: 28, gap: 10 }}>
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
              <Card key={meal.id}>
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

      <View style={{ marginTop: 20 }}>
        <WeekCard budget={profile.dailyCalorieBudget} refreshKey={weekKey} />
      </View>

      <TodayRecipes refreshKey={weekKey} />

      {card && (
        <View style={{ marginTop: 20, gap: 8 }}>
          {card.kind === 'active' ? (
            <Card onPress={() => router.push('/(tabs)/buddy')} label={c.streak.open}>
              <HissaText variant="label">{c.streak.days(card.streak)}</HissaText>
              <HissaText variant="caption">{card.line}</HissaText>
            </Card>
          ) : (
            <Card
              onPress={() => router.push('/(tabs)/buddy')}
              label={card.kind === 'invite' ? c.streak.invite.cta : c.streak.pendingInvite.cta}
            >
              <HissaText variant="label">
                {card.kind === 'invite' ? c.streak.invite.title : c.streak.pendingInvite.title}
              </HissaText>
              <HissaText variant="caption">
                {card.kind === 'invite' ? c.streak.invite.body : c.streak.pendingInvite.body}
              </HissaText>
            </Card>
          )}
          {card.kind === 'active' && card.canNudge && (
            <PrimaryButton outline label={c.streak.nudgeLabel(buddyName)} onPress={nudge} />
          )}
          {card.kind === 'active' && card.nudged && (
            <HissaText variant="caption">{c.streak.nudged}</HissaText>
          )}
        </View>
      )}
    </HissaScreen>
  );
}
