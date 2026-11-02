import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ApiError } from '../../shared/api/client';
import { useSession } from '../../shared/auth/session';
import { useHissaTheme } from '../../shared/theme/HissaThemeProvider';
import { HissaScreen } from '../../shared/ui/hissa/HissaScreen';
import { HissaText } from '../../shared/ui/hissa/HissaText';
import { PrimaryButton } from '../../shared/ui/hissa/PrimaryButton';
import { getBuddyStatus, type BuddyStatus } from '../buddy/api/buddy';
import { getCatalog, getProfile, getToday, type Profile, type Today } from '../core/api';
import { dishById, setCatalog } from '../nutrition/catalog';
import { portionText } from '../nutrition/engine';
import { BudgetRing } from './components/BudgetRing';
import { TodaySkeleton } from './components/Skeleton';

type Loaded = { profile: Profile; today: Today; buddy: BuddyStatus | null };

export function TodayScreen() {
  const router = useRouter();
  const { signOut } = useSession();
  const t = useHissaTheme();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useFocusEffect(useCallback(() => {
    void retry;
    let live = true;
    setLoaded(null);
    setError(null);
    Promise.all([getProfile(), getCatalog(), getToday(), getBuddyStatus().catch(() => null)])
      .then(([profile, catalog, today, buddy]) => {
        if (!live) return;
        setCatalog(catalog.dishes);
        setLoaded({ profile, today, buddy });
      })
      .catch((cause) => {
        if (!live) return;
        if (cause instanceof ApiError && cause.status === 404 && cause.path === '/api/profiles/me') router.replace('/onboarding/goal');
        else setError('Could not load today. Check your connection and try again.');
      });
    return () => { live = false; };
  }, [retry, router]));

  if (error) return <HissaScreen><HissaText accessibilityRole="alert">{error}</HissaText><PrimaryButton label="Try again" onPress={() => setRetry((n) => n + 1)} /></HissaScreen>;
  if (!loaded) return <TodaySkeleton />;

  const { profile, today, buddy } = loaded;
  const budget = profile.dailyCalorieBudget;
  const remaining = Math.max(0, budget - today.totalCalories);
  const empty = today.meals.length === 0;

  return (
    <HissaScreen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <HissaText variant="caption">{today.day}</HissaText>
        <Pressable accessibilityRole="button" onPress={() => void signOut().catch(() => setError('Could not sign out. Try again.'))} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}><HissaText variant="caption">Sign out</HissaText></Pressable>
      </View>
      <HissaText variant="title" accessibilityRole="header" style={{ marginTop: 4 }}>
        {profile.displayName ? `Salaam, ${profile.displayName}` : 'Salaam'}
      </HissaText>
      <View style={{ alignItems: 'center', marginTop: 24 }}>
        <BudgetRing fraction={budget > 0 ? today.totalCalories / budget : 0} label={`About ${empty ? budget : remaining} kcal ${empty ? 'for today' : 'left'}, an estimate`}>
          <HissaText variant="hero">{Math.round(empty ? budget : remaining).toLocaleString('en-US')}</HissaText>
          <HissaText variant="button">{empty ? 'for today' : 'left'}</HissaText>
          <HissaText variant="caption">About, an estimate</HissaText>
        </BudgetRing>
      </View>
      {empty ? (
        <View style={{ marginTop: 28, padding: 24, borderRadius: 24, borderWidth: 1, borderStyle: 'dashed', borderColor: t.rim, alignItems: 'center', gap: 12 }}>
          <HissaText variant="title" accessibilityRole="header">Your plate starts here</HissaText>
          <HissaText muted style={{ textAlign: 'center' }}>Snap what is in front of you. Hissa will suggest a portion.</HissaText>
          <View style={{ alignSelf: 'stretch' }}><PrimaryButton label="Scan my plate" onPress={() => router.push('/(tabs)/scan')} /></View>
        </View>
      ) : (
        <View style={{ marginTop: 28, gap: 10 }}>
          <HissaText variant="label" accessibilityRole="header">Meals today</HissaText>
          {today.meals.map((meal) => {
            const confirmed = meal.items.filter((item) => item.confirmedDish && item.confirmedPortion);
            const names = confirmed.map((item) => dishById(item.confirmedDish!)?.name ?? item.confirmedDish).join(', ');
            return (
              <View key={meal.id} style={{ padding: 16, borderRadius: 18, backgroundColor: t.surf, borderWidth: 1, borderColor: t.hair, gap: 4 }}>
                <HissaText variant="label">{names}</HissaText>
                <HissaText variant="caption">{new Date(meal.eatenAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</HissaText>
                {confirmed.map((item, i) => <HissaText key={i} muted>{portionText({ dishId: item.confirmedDish!, qty: item.confirmedPortion! })} {dishById(item.confirmedDish!)?.name ?? item.confirmedDish}</HissaText>)}
                <HissaText variant="caption">About {Math.round(meal.totalCalories)} kcal, an estimate</HissaText>
              </View>
            );
          })}
        </View>
      )}
      {buddy?.pairStatus === 'active' && (
        <Pressable accessibilityRole="button" accessibilityLabel="Open buddy" onPress={() => router.push('/(tabs)/buddy')} style={{ marginTop: 20, padding: 16, borderRadius: 18, backgroundColor: t.surf, borderWidth: 1, borderColor: t.hair }}>
          <HissaText variant="label">Shared streak: {buddy.streak} days</HissaText>
          <HissaText variant="caption">{buddy.buddyLoggedToday ? 'Your buddy logged today' : 'Your buddy has not logged yet'}</HissaText>
        </Pressable>
      )}
    </HissaScreen>
  );
}
