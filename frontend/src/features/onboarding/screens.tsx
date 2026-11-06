import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useSession } from '../../shared/auth/session';
import { putAvoids, putProfile } from '../core/api';
import { useHissaTheme } from '../../shared/theme/HissaThemeProvider';
import { Chip, OptionCard } from '../../shared/ui/hissa/Choice';
import { HissaScreen } from '../../shared/ui/hissa/HissaScreen';
import { HissaText } from '../../shared/ui/hissa/HissaText';
import { PrimaryButton } from '../../shared/ui/hissa/PrimaryButton';
import { AvoidsPicker } from '../avoids/AvoidsPicker';
import { ONBOARDING_DISHES, avoidsContent } from '../avoids/content';
import { onboardingContent as c } from './content';
import { placeholderDailyKcal } from './placeholderDailyKcal';
import { finishOnboarding, getOnboardingOwner, resetAnswers, setAnswers, useAnswers, useAnswersHydrated, type Activity, type Goal, type Sex } from './store';
import { profilePayload } from './profilePayload';
import { StepHeader } from './StepHeader';
import { StepperRow } from './Stepper';

function Heading({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={{ marginTop: 8 }}>
      <HissaText variant="title" accessibilityRole="header">
        {title}
      </HissaText>
      {sub && (
        <HissaText variant="body" muted style={{ marginTop: 8 }}>
          {sub}
        </HissaText>
      )}
    </View>
  );
}

export function GoalScreen() {
  const router = useRouter();
  const { session } = useSession();
  const ownerId = getOnboardingOwner();
  const { goal } = useAnswers();
  useEffect(() => { if (ownerId && ownerId !== session?.user.id) resetAnswers(); }, [ownerId, session?.user.id]);
  if (ownerId && ownerId !== session?.user.id) return <HissaScreen><HissaText>Starting a new profile…</HissaText></HissaScreen>;
  return (
    <HissaScreen actionBar={<PrimaryButton label={c.goal.cta} onPress={() => router.push('/onboarding/body')} />}>
      <StepHeader step={1} />
      <Heading title={c.goal.title} sub={c.goal.sub} />
      <View accessibilityRole="radiogroup" style={{ marginTop: 28, gap: 12 }}>
        {c.goal.options.map((o) => (
          <OptionCard key={o.id} title={o.title} sub={o.sub} selected={goal === o.id} onPress={() => setAnswers({ goal: o.id as Goal })} />
        ))}
      </View>
    </HissaScreen>
  );
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const feetInches = (inches: number) => `${Math.floor(inches / 12)}'${inches % 12}"`;

export function BodyScreen() {
  const router = useRouter();
  const a = useAnswers();
  return (
    <HissaScreen actionBar={<PrimaryButton label={c.body.cta} onPress={() => router.push('/onboarding/activity')} />}>
      <StepHeader step={2} />
      <Heading title={c.body.title} sub={c.body.sub} />
      <View style={{ marginTop: 28, gap: 12 }}>
        <StepperRow decrease={c.body.decrease('age')} increase={c.body.increase('age')} label={c.body.age.label} shown={String(a.age)} unit={c.body.age.unit} onChange={(d) => setAnswers({ age: clamp(a.age + d, 14, 99) })} />
        <StepperRow decrease={c.body.decrease('height')} increase={c.body.increase('height')} label={c.body.height.label} shown={feetInches(a.heightIn)} unit={c.body.height.unit} onChange={(d) => setAnswers({ heightIn: clamp(a.heightIn + d, 48, 90) })} />
        <StepperRow decrease={c.body.decrease('weight')} increase={c.body.increase('weight')} label={c.body.weight.label} shown={String(a.weightKg)} unit={c.body.weight.unit} onChange={(d) => setAnswers({ weightKg: clamp(a.weightKg + d, 30, 200) })} />
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          {c.body.sex.map((s) => (
            <Chip key={s.id} label={s.label} selected={a.sex === s.id} onPress={() => setAnswers({ sex: s.id as Sex })} />
          ))}
        </View>
      </View>
    </HissaScreen>
  );
}

export function ActivityScreen() {
  const router = useRouter();
  const { activity } = useAnswers();
  return (
    <HissaScreen actionBar={<PrimaryButton label={c.activity.cta} onPress={() => router.push('/onboarding/avoids')} />}>
      <StepHeader step={3} />
      <Heading title={c.activity.title} />
      <View accessibilityRole="radiogroup" style={{ marginTop: 28, gap: 12 }}>
        {c.activity.options.map((o) => (
          <OptionCard key={o.id} title={o.title} sub={o.sub} selected={activity === o.id} onPress={() => setAnswers({ activity: o.id as Activity })} />
        ))}
      </View>
    </HissaScreen>
  );
}

export function AvoidsScreen() {
  const router = useRouter();
  const { avoids } = useAnswers();
  const empty = !avoids.proteins.length && !avoids.dishes.length;
  return (
    <HissaScreen actionBar={<PrimaryButton label={empty ? avoidsContent.skip : avoidsContent.cta} onPress={() => router.push('/onboarding/budget')} />}>
      <StepHeader step={4} />
      <Heading title={avoidsContent.title} sub={avoidsContent.sub} />
      <View style={{ marginTop: 28 }}>
        <AvoidsPicker value={avoids} onChange={(a) => setAnswers({ avoids: a })} dishes={ONBOARDING_DISHES} />
      </View>
    </HissaScreen>
  );
}

export function BudgetScreen() {
  const router = useRouter();
  const { session } = useSession();
  const t = useHissaTheme();
  const answers = useAnswers();
  const ownerId = getOnboardingOwner();
  const hydrated = useAnswersHydrated();
  const [savedBudget, setSavedBudget] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const foreignDraft = !!ownerId && ownerId !== session?.user.id;
  useEffect(() => {
    if (hydrated && foreignDraft) router.replace('/onboarding/goal');
  }, [hydrated, foreignDraft, router]);
  const kcal = (savedBudget ?? placeholderDailyKcal(answers)).toLocaleString('en-US');
  const continueToApp = async () => {
    if (foreignDraft) return router.replace('/onboarding/goal');
    if (!session) {
      finishOnboarding();
      router.replace('/(auth)/sign-in');
      return;
    }
    if (savedBudget !== null) return router.replace('/(tabs)/today');
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const name = session.user.user_metadata?.full_name as string | undefined;
      const profile = await putProfile(profilePayload(answers, name));
      await putAvoids(answers.avoids);
      setSavedBudget(profile.dailyCalorieBudget);
      finishOnboarding(session.user.id);
    } catch {
      setError('Could not save your profile. Try again.');
    } finally {
      setSaving(false);
    }
  };
  if (!hydrated) return <HissaScreen><HissaText>Loading your details…</HissaText></HissaScreen>;
  if (foreignDraft) return <HissaScreen><HissaText>Starting a new profile…</HissaText></HissaScreen>;
  return (
    <HissaScreen actionBar={<View style={{ gap: 8 }}><PrimaryButton label={saving ? 'Saving…' : session && savedBudget === null ? 'Use these details' : c.budget.cta} disabled={saving} onPress={() => void continueToApp()} />{session && savedBudget === null && <PrimaryButton outline label="Start over" onPress={() => { resetAnswers(); router.replace('/onboarding/goal'); }} />}</View>}>
      <StepHeader step={5} />
      <Heading title={c.budget.title} />
      <View style={{ alignItems: 'center', marginTop: 44 }}>
        <View
          accessible
          accessibilityLabel={`About ${kcal} ${c.budget.unit}, an estimate`}
          style={{ width: 260, height: 260, alignItems: 'center', justifyContent: 'center' }}
        >
          <Svg width={260} height={260} viewBox="0 0 220 220" style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
            <Circle cx={110} cy={110} r={100} fill="none" stroke={t.hair} strokeWidth={10} />
            <Circle cx={110} cy={110} r={100} fill="none" stroke={t.tur} strokeWidth={10} strokeLinecap="round" />
          </Svg>
          <HissaText variant="hero">{kcal}</HissaText>
          <HissaText variant="caption">{c.budget.unit}</HissaText>
          <HissaText variant="caption" style={{ marginTop: 2 }}>
            {c.budget.estimate}
          </HissaText>
        </View>
      </View>
      <HissaText variant="body" style={{ marginTop: 36, paddingHorizontal: 12, textAlign: 'center' }}>
        {c.budget.body}
      </HissaText>
      {session && savedBudget === null && <HissaText muted style={{ marginTop: 12, textAlign: 'center' }}>Use your details: {answers.age} years, {feetInches(answers.heightIn)}, {answers.weightKg} kg, {answers.sex}, {answers.activity === 'onFeet' ? 'on your feet' : answers.activity}, goal to eat {answers.goal === 'lighter' ? 'lighter' : 'steadily'}.</HissaText>}
      {error && <HissaText accessibilityRole="alert" style={{ marginTop: 12, textAlign: 'center' }}>{error}</HissaText>}
    </HissaScreen>
  );
}
