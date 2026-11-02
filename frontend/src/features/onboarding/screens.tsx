import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useSession } from '../../shared/auth/session';
import { putProfile } from '../core/api';
import { useHissaTheme } from '../../shared/theme/HissaThemeProvider';
import { hissaRadii } from '../../shared/theme/hissaTokens';
import { Chip, OptionCard } from '../../shared/ui/hissa/Choice';
import { HissaScreen } from '../../shared/ui/hissa/HissaScreen';
import { HissaText } from '../../shared/ui/hissa/HissaText';
import { PrimaryButton } from '../../shared/ui/hissa/PrimaryButton';
import { onboardingContent as c } from './content';
import { placeholderDailyKcal } from './placeholderDailyKcal';
import { finishOnboarding, getOnboardingOwner, resetAnswers, setAnswers, useAnswers, useAnswersHydrated, type Activity, type Goal, type Sex } from './store';
import { profilePayload } from './profilePayload';
import { StepHeader } from './StepHeader';

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

function StepButton({ glyph, label, onPress }: { glyph: string; label: string; onPress: () => void }) {
  const t = useHissaTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        width: 48,
        height: 48,
        borderRadius: hissaRadii.control,
        borderWidth: 1,
        borderColor: t.hair,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <HissaText style={{ fontSize: 22, lineHeight: 28 }} variant="label">
        {glyph}
      </HissaText>
    </Pressable>
  );
}

function StepperRow(p: { label: string; shown: string; unit: string; onChange: (d: number) => void }) {
  const t = useHissaTheme();
  const what = p.label.toLowerCase();
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`${p.label}, ${p.shown} ${p.unit}`.trim()}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => p.onChange(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
      style={{
        height: 72,
        paddingLeft: 16,
        paddingRight: 12,
        borderRadius: hissaRadii.control,
        backgroundColor: t.surf,
        borderWidth: 1,
        borderColor: t.hair,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <HissaText variant="button" muted style={{ flex: 1 }}>
        {p.label}
      </HissaText>
      <StepButton glyph="-" label={c.body.decrease(what)} onPress={() => p.onChange(-1)} />
      <View style={{ minWidth: 76, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
        <HissaText variant="value">{p.shown}</HissaText>
        {p.unit !== '' && <HissaText variant="caption">{p.unit}</HissaText>}
      </View>
      <StepButton glyph="+" label={c.body.increase(what)} onPress={() => p.onChange(1)} />
    </View>
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
        <StepperRow label={c.body.age.label} shown={String(a.age)} unit={c.body.age.unit} onChange={(d) => setAnswers({ age: clamp(a.age + d, 14, 99) })} />
        <StepperRow label={c.body.height.label} shown={feetInches(a.heightIn)} unit={c.body.height.unit} onChange={(d) => setAnswers({ heightIn: clamp(a.heightIn + d, 48, 90) })} />
        <StepperRow label={c.body.weight.label} shown={String(a.weightKg)} unit={c.body.weight.unit} onChange={(d) => setAnswers({ weightKg: clamp(a.weightKg + d, 30, 200) })} />
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
    <HissaScreen actionBar={<PrimaryButton label={c.activity.cta} onPress={() => router.push('/onboarding/budget')} />}>
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
      <StepHeader step={4} />
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
