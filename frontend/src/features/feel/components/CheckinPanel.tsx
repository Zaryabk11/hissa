import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useHissaTheme } from '../../../shared/theme/HissaThemeProvider';
import { Chip } from '../../../shared/ui/hissa/Choice';
import { HissaText } from '../../../shared/ui/hissa/HissaText';
import { PrimaryButton } from '../../../shared/ui/hissa/PrimaryButton';
import { getDueCheckin, getQuestion, submitCheckin, type DueCheckin } from '../api/feel';
import { feelContent as c } from '../content';
import {
  canSubmit,
  checkinBody,
  needsSymptomDetail,
  preExistingStep,
  shouldAskPreExisting,
  shouldAutoSubmit,
  symptomStep,
  type Energy,
  type PreExisting,
  type Question,
  type Stomach,
  type Symptom,
} from '../feel-view';
import { Card } from './Card';
import { PlateClock } from './PlateClock';
import { Bone, CardSkeleton } from './Skeleton';

const ENERGY: Energy[] = ['low', 'okay', 'good'];
const STOMACH: Stomach[] = ['heavy', 'fine', 'light'];

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ gap: 8 }}>
      <HissaText variant="eyebrow">{label}</HissaText>
      <View style={{ flexDirection: 'row', gap: 8 }}>{children}</View>
    </View>
  );
}

export function CheckinPanel() {
  const t = useHissaTheme();
  const [due, setDue] = useState<DueCheckin | undefined>(undefined);
  const [loadFailed, setLoadFailed] = useState(false);
  const [energy, setEnergy] = useState<Energy | null>(null);
  const [stomach, setStomach] = useState<Stomach | null>(null);
  const [symptom, setSymptom] = useState<Symptom | undefined>(undefined);
  const [message, setMessage] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<string[]>([]); // meal ids skipped on this screen
  // null question = the server had nothing usable, so the fixed wording is shown.
  const [asked, setAsked] = useState<{ mealId: string; question: Question | null } | null>(null);
  // Optional follow-up after the symptom step; null question = nothing offered, today's flow.
  const [followUp, setFollowUp] = useState<{ mealId: string; question: Question | null } | null>(
    null,
  );
  const [preExisting, setPreExisting] = useState<PreExisting | undefined>(undefined);
  const saving = useRef(false);
  const asking = useRef<string | null>(null);
  const askingFollowUp = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      setDue(await getDueCheckin(skipped));
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    }
  }, [skipped]);
  useFocusEffect(
    useCallback(() => {
      setMessage(null);
      void load();
    }, [load]),
  );

  // The follow-up question is only needed for a heavy stomach, and never blocks saving.
  const mealId = due?.mealId;
  const heavy = needsSymptomDetail(stomach);
  useEffect(() => {
    if (!mealId || !heavy || asking.current === mealId) return;
    asking.current = mealId;
    getQuestion(mealId)
      .then((question) => ({ mealId, question }))
      .catch(() => ({ mealId, question: null }))
      .then(setAsked);
  }, [mealId, heavy]);

  // Once the symptom step is answered, ask the server for the optional follow-up; never blocks saving.
  const askFollowUp = !!mealId && shouldAskPreExisting(stomach, symptom);
  useEffect(() => {
    if (!mealId || !askFollowUp || askingFollowUp.current === mealId) return;
    askingFollowUp.current = mealId;
    getQuestion(mealId, true)
      .then((question) => ({ mealId, question }))
      .catch(() => ({ mealId, question: null }))
      .then(setFollowUp);
  }, [mealId, askFollowUp]);

  const preExistingStepNow = preExistingStep(
    followUp && followUp.mealId === mealId ? followUp.question : null,
  );
  const preExistingShown = askFollowUp && preExistingStepNow !== null;

  async function save(nextEnergy: Energy, nextStomach: Stomach) {
    if (!due || saving.current) return;
    saving.current = true;
    try {
      await submitCheckin(
        checkinBody({
          mealId: due.mealId,
          energy: nextEnergy,
          stomach: nextStomach,
          symptom,
          preExisting: preExistingShown ? preExisting : undefined,
        }),
      );
      setEnergy(null);
      setStomach(null);
      setSymptom(undefined);
      setPreExisting(undefined);
      setMessage(c.saved);
    } catch {
      setMessage(c.saveError);
    } finally {
      saving.current = false;
    }
    await load(); // the meal may be answered or expired either way
  }

  function pick(nextEnergy: Energy | null, nextStomach: Stomach | null) {
    setMessage(null);
    setEnergy(nextEnergy);
    setStomach(nextStomach);
    if (nextEnergy && nextStomach && shouldAutoSubmit(nextEnergy, nextStomach))
      void save(nextEnergy, nextStomach);
  }

  if (loadFailed)
    return (
      <Card>
        <HissaText accessibilityRole="alert">{c.loadError}</HissaText>
        <PrimaryButton label={c.retry} onPress={() => void load()} />
      </Card>
    );
  if (due === undefined) return <CardSkeleton label={c.loading} />;
  if (due === null)
    return (
      <Card gap={8}>
        {message ? (
          <HissaText variant="label" accessibilityRole="alert">
            {message}
          </HissaText>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <PlateClock />
          <View style={{ flex: 1, gap: 4 }}>
            <HissaText variant="label" accessibilityRole="header">
              {c.empty.title}
            </HissaText>
            <HissaText muted>{c.empty.body}</HissaText>
          </View>
        </View>
      </Card>
    );

  const questionPending = heavy && asked?.mealId !== due.mealId;
  const step = symptomStep(asked?.mealId === due.mealId ? asked.question : null);

  return (
    <Card gap={16}>
      <View style={{ gap: 4 }}>
        <HissaText variant="label" accessibilityRole="header">
          {c.title}
        </HissaText>
        {due.dishes.length ? <HissaText muted>{due.dishes.join(', ')}</HissaText> : null}
      </View>
      <Row label={c.energy.label}>
        {ENERGY.map((value) => (
          <Chip
            key={value}
            label={c.energy[value]}
            selected={energy === value}
            onPress={() => pick(value, stomach)}
          />
        ))}
      </Row>
      <Row label={c.stomach.label}>
        {STOMACH.map((value) => (
          <Chip
            key={value}
            label={c.stomach[value]}
            selected={stomach === value}
            onPress={() => pick(energy, value)}
          />
        ))}
      </Row>
      {heavy ? (
        questionPending ? (
          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={c.loadingQuestion}
            accessibilityState={{ busy: true }}
            style={{ gap: 8 }}
          >
            <Bone width="70%" height={20} />
            <Bone width="100%" height={48} radius={14} />
          </View>
        ) : (
          <View accessibilityRole="radiogroup" accessibilityLabel={step.text} style={{ gap: 8 }}>
            <HissaText variant="eyebrow">{step.text}</HissaText>
            <View style={{ gap: 8 }}>
              {pairs(step.options).map((pair) => (
                <View key={pair[0].id} style={{ flexDirection: 'row', gap: 8 }}>
                  {pair.map(({ id, label }) => (
                    <Chip
                      key={id}
                      label={label}
                      selected={symptom === id}
                      onPress={() => setSymptom(id)}
                    />
                  ))}
                </View>
              ))}
            </View>
          </View>
        )
      ) : null}
      {heavy && !questionPending && preExistingShown && preExistingStepNow ? (
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={preExistingStepNow.text}
          style={{ gap: 8 }}
        >
          <HissaText variant="eyebrow">{preExistingStepNow.text}</HissaText>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {preExistingStepNow.options.map(({ id, label }) => (
              <Chip
                key={id}
                label={label}
                selected={preExisting === id}
                onPress={() => setPreExisting(id)}
              />
            ))}
          </View>
        </View>
      ) : null}
      <View style={{ gap: 8 }}>
        {heavy ? (
          <PrimaryButton
            label={c.save}
            disabled={!canSubmit(energy, stomach)}
            onPress={() => energy && stomach && void save(energy, stomach)}
          />
        ) : null}
        <PrimaryButton
          outline
          label={c.skip}
          onPress={() => {
            setMessage(null);
            setEnergy(null);
            setStomach(null);
            setSymptom(undefined);
            setPreExisting(undefined);
            setSkipped([...skipped, due.mealId]);
          }}
        />
      </View>
      {message ? (
        <HissaText accessibilityRole="alert" style={{ color: t.muted }}>
          {message}
        </HissaText>
      ) : null}
    </Card>
  );
}

function pairs<T>(items: T[]): [T, ...T[]][] {
  const out: [T, ...T[]][] = [];
  for (let i = 0; i < items.length; i += 2) out.push(items.slice(i, i + 2) as [T, ...T[]]);
  return out;
}
