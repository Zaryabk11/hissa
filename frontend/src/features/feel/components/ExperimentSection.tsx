import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { ApiError } from '../../../shared/api/client';
import { Chip } from '../../../shared/ui/hissa/Choice';
import { HissaText } from '../../../shared/ui/hissa/HissaText';
import { PrimaryButton } from '../../../shared/ui/hissa/PrimaryButton';
import { getToday } from '../../core/api';
import { createExperiment, getCurrentExperiment, markExperimentTried } from '../api/feel';
import { feelContent } from '../content';
import {
  EXPERIMENT_ACTIONS,
  experimentErrorMessage,
  latestMealIdAfter,
  reviewLines,
  type Experiment,
  type ExperimentAction,
} from '../feel-view';
import { Card } from './Card';
import { CardSkeleton } from './Skeleton';

const c = feelContent.experiment;
const statusOf = (e: unknown) => (e instanceof ApiError ? e.status : undefined);

/**
 * Private "try next time" choice: pick one, mark it tried, read back what was logged.
 * `patternKey` is set only when the weekly card is a real pattern.
 */
export function ExperimentSection({ patternKey }: { patternKey: string | null }) {
  const [experiment, setExperiment] = useState<Experiment | null | undefined>(undefined); // undefined = loading
  const [mealId, setMealId] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [action, setAction] = useState<ExperimentAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { experiment: current } = await getCurrentExperiment();
      // Meals are only needed to mark an active choice as tried.
      const meals = current?.status === 'active' ? (await getToday()).meals : [];
      setMealId(current ? latestMealIdAfter(meals, current.createdAt) : null);
      setExperiment(current);
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function run(request: () => Promise<{ experiment: Experiment }>) {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      setExperiment((await request()).experiment);
      setAction(null);
    } catch (e) {
      setMessage(experimentErrorMessage(statusOf(e)));
    } finally {
      setBusy(false);
    }
  }

  if (loadFailed)
    return (
      <Card>
        <HissaText accessibilityRole="alert">{c.loadError}</HissaText>
        <PrimaryButton label={feelContent.retry} onPress={() => void load()} />
      </Card>
    );
  if (experiment === undefined)
    return patternKey ? <CardSkeleton label={c.loading} lines={1} /> : null;

  const alert = message ? (
    <HissaText accessibilityRole="alert" muted>
      {message}
    </HissaText>
  ) : null;

  if (experiment?.status === 'active')
    return (
      <Card gap={10}>
        <HissaText variant="label" accessibilityRole="header">
          {c.activeTitle}
        </HissaText>
        <HissaText>{c.actions[experiment.action]}</HissaText>
        <HissaText muted>{c.activeHelp}</HissaText>
        {mealId ? null : <HissaText muted>{c.needMeal}</HissaText>}
        <PrimaryButton
          label={busy ? c.marking : c.tried}
          disabled={!mealId || busy}
          onPress={() => mealId && void run(() => markExperimentTried(experiment.id, mealId))}
        />
        {alert}
      </Card>
    );

  return (
    <>
      {experiment ? (
        <Card gap={10}>
          <HissaText variant="label" accessibilityRole="header">
            {c.reviewTitle}
          </HissaText>
          <HissaText muted>{c.actions[experiment.action]}</HissaText>
          {reviewLines(experiment).map((line) => (
            <HissaText key={line}>{line}</HissaText>
          ))}
        </Card>
      ) : null}
      {patternKey ? (
        <Card gap={12}>
          <HissaText variant="label" accessibilityRole="header">
            {c.title}
          </HissaText>
          <HissaText muted>{c.prompt}</HissaText>
          <View accessibilityRole="radiogroup" accessibilityLabel={c.title} style={{ gap: 8 }}>
            {EXPERIMENT_ACTIONS.map((value) => (
              <View key={value} style={{ flexDirection: 'row' }}>
                <Chip
                  label={c.actions[value]}
                  selected={action === value}
                  onPress={() => setAction(value)}
                />
              </View>
            ))}
          </View>
          <PrimaryButton
            label={busy ? c.saving : c.confirm}
            disabled={!action || busy}
            onPress={() => action && void run(() => createExperiment(patternKey, action))}
          />
          <HissaText variant="caption">{c.private}</HissaText>
          {alert}
        </Card>
      ) : null}
    </>
  );
}
