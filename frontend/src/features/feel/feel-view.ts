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

// GET /api/feel/question/:mealId. Only symptom_detail is used; `source` is never shown.
export type QuestionOption = { id: Symptom; label: string };
export type Question = {
  mealId: string;
  intent: 'symptom_detail';
  text: string;
  options: QuestionOption[];
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

const SYMPTOM_IDS = FIXED_SYMPTOM_STEP.options.map((o) => o.id);

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
  return usable ? { text: question.text, options: question.options } : FIXED_SYMPTOM_STEP;
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
