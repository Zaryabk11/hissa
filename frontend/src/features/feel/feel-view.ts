import { feelContent } from './content';

export type Energy = 'low' | 'okay' | 'good';
export type Stomach = 'heavy' | 'fine' | 'light';
export type Symptom = 'bloated' | 'upset' | 'other' | 'not_sure';

// The optional symptom tap is offered only after a "heavy" stomach answer.
export const needsSymptomDetail = (stomach: Stomach | null): boolean => stomach === 'heavy';

export const canSubmit = (energy: Energy | null, stomach: Stomach | null): boolean =>
  energy !== null && stomach !== null;

// Two taps (energy + stomach) save the baseline; "heavy" waits for the optional symptom row.
export const shouldAutoSubmit = (energy: Energy | null, stomach: Stomach | null): boolean =>
  canSubmit(energy, stomach) && !needsSymptomDetail(stomach);

// GET /api/feel/question/:mealId. `source` is never shown.
export type QuestionOption = { id: Symptom; label: string };
export type PreExisting = 'yes' | 'no' | 'not_sure';
export type Question = {
  mealId: string;
  intent: 'symptom_detail' | 'pre_existing';
  text: string;
  options: { id: string; label: string }[];
  source: 'gemini' | 'fallback';
};

export const FIXED_SYMPTOM_STEP: { text: string; options: QuestionOption[] } = {
  text: 'Anything specific? (optional)',
  options: [
    { id: 'bloated', label: 'Bloated' },
    { id: 'upset', label: 'Upset' },
    { id: 'other', label: 'Other' },
    { id: 'not_sure', label: 'Not sure' },
  ],
};

const SYMPTOM_IDS: string[] = FIXED_SYMPTOM_STEP.options.map((o) => o.id);

// The server wording when it is a usable symptom question, else the fixed copy.
export function symptomStep(question: Question | null): {
  text: string;
  options: QuestionOption[];
} {
  const usable =
    question &&
    question.intent === 'symptom_detail' &&
    question.text.trim() !== '' &&
    question.options.length > 0 &&
    question.options.every((o) => SYMPTOM_IDS.includes(o.id) && o.label.trim() !== '');
  return usable
    ? { text: question.text, options: question.options as QuestionOption[] }
    : FIXED_SYMPTOM_STEP;
}

// The skippable "already felt this way before the meal?" step comes after the symptom step is
// answered, for a heavy stomach only. The server decides whether to actually offer it.
export const shouldAskPreExisting = (stomach: Stomach | null, symptom: Symptom | undefined) =>
  needsSymptomDetail(stomach) && symptom !== undefined;

const PRE_EXISTING_IDS = ['yes', 'no', 'not_sure'];

// The server copy as given, or null (today's flow) unless it is a usable pre_existing question.
export function preExistingStep(
  question: Question | null,
): { text: string; options: { id: PreExisting; label: string }[] } | null {
  const usable =
    question &&
    question.intent === 'pre_existing' &&
    question.text.trim() !== '' &&
    question.options.length > 0 &&
    question.options.every((o) => PRE_EXISTING_IDS.includes(o.id) && o.label.trim() !== '');
  return usable
    ? { text: question.text, options: question.options as { id: PreExisting; label: string }[] }
    : null;
}

// POST /api/feel/checkins body. The symptom and the follow-up answer only go with a heavy stomach,
// and the follow-up only after a symptom was chosen (the step it follows).
export function checkinBody(input: {
  mealId: string;
  energy: Energy;
  stomach: Stomach;
  symptom?: Symptom;
  preExisting?: PreExisting;
}) {
  const { mealId, energy, stomach, symptom, preExisting } = input;
  const heavy = needsSymptomDetail(stomach);
  return {
    mealId,
    energy,
    stomach,
    ...(heavy && symptom ? { symptom } : {}),
    ...(heavy && symptom && preExisting
      ? { questionType: 'pre_existing' as const, answerId: preExisting }
      : {}),
  };
}

// GET /api/feel/pattern. `label` is server-written copy and is shown as given.
export type PatternCard = {
  state: 'insufficient_data' | 'no_pattern' | 'question' | 'pattern';
  isSample: boolean;
  checkins: number;
  needed: number;
  window: { from: string; to: string };
  pattern: null | {
    patternKey: string;
    kind: 'category' | 'dish';
    subject: string;
    outcome: 'heavy' | 'good_energy';
    matching: number;
    relevant: number;
    comparison: null | { matching: number; total: number };
  };
  label: string;
};

export type PatternView =
  | { kind: 'progress'; fraction: number; caption: string }
  | { kind: 'none' }
  | { kind: 'finding'; label: string; counts: string[] };

export const progressFraction = (done: number, needed: number): number =>
  needed > 0 ? Math.min(1, Math.max(0, done / needed)) : 0;

export function patternView(card: PatternCard): PatternView | null {
  switch (card.state) {
    case 'insufficient_data':
      return {
        kind: 'progress',
        fraction: progressFraction(card.checkins, card.needed),
        caption: `${card.checkins} of ${card.needed} check-ins this week`,
      };
    case 'no_pattern':
      return { kind: 'none' };
    case 'question':
    case 'pattern': {
      if (!card.label) return null;
      const p = card.pattern;
      const counts = p ? [`${p.matching} of ${p.relevant} meals in your logs`] : [];
      if (p?.comparison)
        counts.push(`${p.comparison.matching} of ${p.comparison.total} other meals`);
      return { kind: 'finding', label: card.label, counts };
    }
    default:
      return null;
  }
}

// Private "try next time" experiment (POST/GET /api/feel/experiments...).
export type ExperimentAction = 'smaller_portion' | 'different_side' | 'observe_again';
export const EXPERIMENT_ACTIONS: ExperimentAction[] = [
  'smaller_portion',
  'different_side',
  'observe_again',
];
export type Experiment = {
  id: string;
  patternKey: string;
  action: ExperimentAction;
  status: 'active' | 'tried';
  createdAt: string;
  triedAt: string | null;
  tried: { mealId: string; energy: Energy | null; stomach: Stomach | null } | null;
};

// The key to save a choice against: only a real pattern card, and never while one is active.
export const offerablePatternKey = (
  card: PatternCard | null,
  experiment: Experiment | null,
): string | null =>
  card?.state === 'pattern' && experiment?.status !== 'active'
    ? (card.pattern?.patternKey ?? null)
    : null;

// The latest of the caller's meals saved after the experiment began, or null.
export function latestMealIdAfter(
  meals: { id: string; eatenAt: string }[],
  createdAt: string,
): string | null {
  const since = Date.parse(createdAt);
  let best: { id: string; at: number } | null = null;
  for (const m of meals) {
    const at = Date.parse(m.eatenAt);
    if (at > since && (!best || at > best.at)) best = { id: m.id, at };
  }
  return best?.id ?? null;
}

// Plain restating of what was logged. It never says the action changed anything.
export function reviewLines(experiment: Experiment): string[] {
  const c = feelContent.experiment;
  const { energy, stomach } = experiment.tried ?? { energy: null, stomach: null };
  const parts = [energy && `energy ${energy}`, stomach && `stomach ${stomach}`].filter(
    (p): p is string => !!p,
  );
  if (!parts.length) return [c.reviewPending];
  return [`You logged: ${parts.join(', ')} for that meal.`, c.reviewNote];
}

export function experimentErrorMessage(status: number | undefined): string {
  const e = feelContent.experiment.errors;
  return status === 409 ? e.conflict : status === 400 ? e.invalid : e.generic;
}
