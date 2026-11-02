import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useHissaTheme } from '../../shared/theme/HissaThemeProvider';
import { hissaRadii } from '../../shared/theme/hissaTokens';
import { HissaScreen } from '../../shared/ui/hissa/HissaScreen';
import { HissaText } from '../../shared/ui/hissa/HissaText';
import { PrimaryButton } from '../../shared/ui/hissa/PrimaryButton';
import { kcalForItems, mealName, remainingBudget } from '../nutrition/engine';
import { averageKcal, dateKey, lastDays, weekHasEnoughData, type DayTotal } from '../nutrition/week';
import { placeholderDailyKcal } from '../onboarding/placeholderDailyKcal';
import { useAnswers, useAnswersHydrated } from '../onboarding/store';
import { BudgetRing } from './components/BudgetRing';
import { MealSheet } from './components/MealSheet';
import { TodaySkeleton } from './components/Skeleton';
import { UndoBar } from './components/UndoBar';
import { todayContent as c } from './content';
import { showWeeklyPattern } from './flags';
import { dateLabel, fmt, mealTimeLabel } from './format';
import { mealsOn, removeMeal, restoreMeal, useMealsByDate, useMealsHydrated, type StoredMeal } from './mealsStore';
import { getMockMeals, MOCK_DEFAULT, MOCK_PROFILE, type MockState } from './mockData';

function Card({ children, radius = hissaRadii.control, style }: { children: React.ReactNode; radius?: number; style?: object }) {
  const t = useHissaTheme();
  return <View style={[{ borderRadius: radius, backgroundColor: t.surf, borderWidth: 1, borderColor: t.hair }, style]}>{children}</View>;
}

function Avatar({ letter, filled, overlap }: { letter: string; filled: boolean; overlap?: boolean }) {
  const t = useHissaTheme();
  return (
    <View
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: filled ? t.pri : t.hair,
        borderWidth: 2,
        borderColor: t.surf,
        marginLeft: overlap ? -12 : 0,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <HissaText variant="label" style={{ color: filled ? t.onPri : t.ink }}>
        {letter}
      </HissaText>
    </View>
  );
}

function MealRow({ meal, onPress }: { meal: StoredMeal; onPress?: () => void }) {
  const t = useHissaTheme();
  const name = mealName(meal.items);
  const kcal = c.meals.kcal(fmt(kcalForItems(meal.items)));
  const row = (
    <Card style={{ minHeight: 64, paddingVertical: 8, paddingLeft: 12, paddingRight: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={{ width: 40, height: 40, borderRadius: hissaRadii.tile, backgroundColor: t.hair, borderWidth: 1, borderColor: t.rim }}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <HissaText variant="label">{name}</HissaText>
        <HissaText variant="caption">{mealTimeLabel(meal.at)}</HissaText>
      </View>
      <HissaText variant="caption" muted style={{ textAlign: 'right', flexShrink: 0 }}>
        {kcal}
      </HissaText>
    </Card>
  );
  if (!onPress) return row;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${c.sheet.edit(name)}, ${kcal}`} onPress={onPress}>
      {row}
    </Pressable>
  );
}

function StreakCard({ name, buddy }: { name: string; buddy: string }) {
  const t = useHissaTheme();
  const [nudged, setNudged] = useState(false);
  const { buddyLogged, streak } = MOCK_PROFILE;
  return (
    <Card style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flexDirection: 'row' }}>
        <Avatar letter={name[0] ?? c.streak.you[0]} filled />
        <Avatar letter={buddy.split(' ').pop()![0].toUpperCase()} filled={false} overlap />
      </View>
      <View accessible accessibilityLabel={`${c.streak.label(streak)}. ${buddyLogged ? c.streak.both(buddy) : c.streak.pending(buddy)}`} style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill={t.tur} stroke={t.tur} strokeWidth={1.75} strokeLinejoin="round">
            <Path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
          </Svg>
          <HissaText variant="title">{streak}</HissaText>
          <HissaText variant="caption">{c.streak.days}</HissaText>
        </View>
        <HissaText variant="caption">{buddyLogged ? c.streak.both(buddy) : c.streak.pending(buddy)}</HissaText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={c.streak.nudgeLabel(buddy)}
        accessibilityState={{ disabled: nudged }}
        onPress={() => setNudged(true)}
        style={{ height: 48, minWidth: 48, paddingHorizontal: 16, borderRadius: hissaRadii.control, borderWidth: 1, borderColor: t.hair, justifyContent: 'center' }}
      >
        <HissaText variant="button" muted={nudged}>
          {nudged ? c.streak.nudged : c.streak.nudge}
        </HissaText>
      </Pressable>
    </Card>
  );
}

function WeeklyPattern({ days, budget }: { days: DayTotal[]; budget: number }) {
  const t = useHissaTheme();
  const avg = averageKcal(days);
  return (
    <Card radius={24} style={{ padding: 20 }}>
      <HissaText variant="title" accessibilityRole="header" style={{ fontSize: 22, lineHeight: 28 }}>
        {c.week.title}
      </HissaText>
      <HissaText variant="caption" style={{ marginTop: 2 }}>
        {c.week.sub}
      </HissaText>
      <View accessible accessibilityRole="image" accessibilityLabel={c.week.label} style={{ height: 150, marginTop: 20, flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
        <View style={{ position: 'absolute', left: 0, right: 0, top: 6, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: t.rim }} />
        {days.map((d) => (
          <View
            key={d.key}
            style={{
              flex: 1,
              height: d.hasMeals ? Math.min(150, Math.max(8, (d.kcal / budget) * 144)) : 40,
              borderRadius: hissaRadii.tile,
              backgroundColor: d.isToday ? t.tur : d.hasMeals ? t.rim : 'transparent',
              borderWidth: d.hasMeals ? 0 : 1.5,
              borderStyle: 'dashed',
              borderColor: t.hair,
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
        {days.map((d) => (
          <HissaText key={d.key} variant={d.isToday ? 'label' : 'caption'} style={{ flex: 1, textAlign: 'center', color: t.ink, fontSize: 14, lineHeight: 20 }}>
            {d.letter}
          </HissaText>
        ))}
      </View>
      <HissaText style={{ marginTop: 20 }}>{avg <= budget * 1.1 ? c.week.near : c.week.big}</HissaText>
      <HissaText variant="caption" style={{ marginTop: 8 }}>
        {c.week.average(fmt(avg))}
      </HissaText>
      <HissaText variant="caption">{c.week.basis(days.filter((d) => d.hasMeals).length)}</HissaText>
    </Card>
  );
}

/** `mock` is only set when a mock state is picked on purpose (`?mock=`); then mock meals and profile names show instead of stored data. */
export function TodayScreen({ mock }: { mock?: MockState }) {
  const t = useHissaTheme();
  const router = useRouter();
  const answers = useAnswers();
  const byDate = useMealsByDate();
  const mealsReady = useMealsHydrated();
  const answersReady = useAnswersHydrated();
  const ready = mealsReady && answersReady;
  const [openId, setOpenId] = useState<string | null>(null);
  const [undo, setUndo] = useState<StoredMeal | null>(null);
  const budget = placeholderDailyKcal(answers);
  const state = mock ?? MOCK_DEFAULT;
  if (state === 'loading' || !ready) return <TodaySkeleton />;

  const now = new Date();
  const meals = mock ? getMockMeals(state, budget) : mealsOn(byDate, dateKey(now));
  const eaten = kcalForItems(meals.flatMap((m) => m.items));
  const left = Math.max(0, remainingBudget(budget, eaten));
  const empty = meals.length === 0;
  const name = answers.name || (mock ? MOCK_PROFILE.name : '');
  const buddy = mock ? MOCK_PROFILE.buddy : c.streak.buddyFallback;
  const ringNumber = fmt(empty ? budget : left);
  const ringUnit = empty ? c.ring.forToday : c.ring.left;
  const days = lastDays(byDate, now);
  const showWeek = showWeeklyPattern && !mock && weekHasEnoughData(days);
  const open = meals.find((m) => m.id === openId) ?? null;

  return (
    <>
      <HissaScreen
        actionBar={
          undo && (
            <UndoBar
              onUndo={() => {
                restoreMeal(undo);
                setUndo(null);
              }}
              onExpire={() => setUndo(null)}
            />
          )
        }
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <HissaText variant="caption">{dateLabel(now)}</HissaText>
            <HissaText variant="title" accessibilityRole="header" style={{ fontSize: 22, lineHeight: 28 }}>
              {c.greeting(name)}
            </HissaText>
          </View>
          {!empty && name !== '' && <Avatar letter={name[0]} filled />}
        </View>

        <View style={{ alignItems: 'center', marginTop: 12 }}>
          <BudgetRing fraction={empty ? 0 : eaten / budget} label={c.ring.label(ringNumber, ringUnit)}>
            <HissaText variant="hero">{ringNumber}</HissaText>
            <HissaText variant="button" style={{ fontSize: 14 }}>
              {ringUnit}
            </HissaText>
            <HissaText variant="caption">{c.ring.estimate}</HissaText>
          </BudgetRing>
        </View>
        {!empty && left === 0 && <HissaText style={{ marginTop: 12, textAlign: 'center' }}>{c.ring.atBudget}</HissaText>}

        {empty ? (
          <View style={{ marginTop: 24, borderRadius: 24, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.rim, paddingVertical: 32, paddingHorizontal: 24, alignItems: 'center' }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: t.surf, borderWidth: 1, borderColor: t.hair, alignItems: 'center', justifyContent: 'center' }}>
              <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={t.pri} strokeWidth={1.75} strokeLinejoin="round">
                <Path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                <Circle cx={12} cy={13} r={3.5} />
              </Svg>
            </View>
            <HissaText variant="title" accessibilityRole="header" style={{ fontSize: 22, lineHeight: 28, marginTop: 16, textAlign: 'center' }}>
              {c.empty.title}
            </HissaText>
            <HissaText muted style={{ marginTop: 6, textAlign: 'center' }}>
              {c.empty.body}
            </HissaText>
            <View style={{ alignSelf: 'stretch', marginTop: 20 }}>
              <PrimaryButton label={c.empty.cta} onPress={() => router.push('/(tabs)/scan')} />
            </View>
          </View>
        ) : (
          <>
            <View style={{ marginTop: 20, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <HissaText variant="label" accessibilityRole="header" style={{ fontSize: 18, lineHeight: 24 }}>
                {c.meals.title}
              </HissaText>
              <HissaText variant="caption">{c.meals.logged(meals.length)}</HissaText>
            </View>
            <View style={{ marginTop: 8, gap: 8 }}>
              {meals.map((m) => (
                <MealRow key={m.id} meal={m} onPress={mock ? undefined : () => setOpenId(m.id)} />
              ))}
            </View>
            {showWeek && (
              <View style={{ marginTop: 16 }}>
                <WeeklyPattern days={days} budget={budget} />
              </View>
            )}
            <View style={{ marginTop: 16 }}>
              <StreakCard name={name} buddy={buddy} />
            </View>
          </>
        )}
      </HissaScreen>
      <MealSheet
        meal={open}
        onClose={() => setOpenId(null)}
        onRemove={(m) => {
          removeMeal(m.id);
          setOpenId(null);
          setUndo(m);
        }}
      />
    </>
  );
}
