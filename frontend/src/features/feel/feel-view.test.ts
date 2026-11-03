import { describe, expect, it } from 'vitest';
import {
  FIXED_SYMPTOM_STEP,
  canSubmit,
  needsSymptomDetail,
  patternView,
  progressFraction,
  shouldAutoSubmit,
  symptomStep,
  type PatternCard,
  type Question,
} from './feel-view';

describe('check-in answers', () => {
  it('asks for a symptom detail only when the stomach felt heavy', () => {
    expect(needsSymptomDetail('heavy')).toBe(true);
    expect(needsSymptomDetail('fine')).toBe(false);
    expect(needsSymptomDetail('light')).toBe(false);
    expect(needsSymptomDetail(null)).toBe(false);
  });

  it('needs both energy and stomach before it can be submitted', () => {
    expect(canSubmit('low', null)).toBe(false);
    expect(canSubmit(null, 'fine')).toBe(false);
    expect(canSubmit('good', 'fine')).toBe(true);
  });

  it('saves automatically after two taps unless the stomach felt heavy', () => {
    expect(shouldAutoSubmit('good', 'fine')).toBe(true);
    expect(shouldAutoSubmit('low', 'light')).toBe(true);
    expect(shouldAutoSubmit('okay', 'heavy')).toBe(false);
    expect(shouldAutoSubmit(null, 'fine')).toBe(false);
    expect(shouldAutoSubmit('good', null)).toBe(false);
  });
});

const card = (over: Partial<PatternCard>): PatternCard => ({
  state: 'insufficient_data',
  isSample: false,
  checkins: 0,
  needed: 7,
  window: { from: '2026-10-28', to: '2026-11-03' },
  pattern: null,
  label: '',
  ...over,
});
const found = {
  patternKey: 'k',
  kind: 'category' as const,
  subject: 'rice',
  outcome: 'heavy' as const,
  matching: 3,
  relevant: 4,
  comparison: null,
};

describe('symptom question', () => {
  const server: Question = {
    mealId: 'm1',
    intent: 'symptom_detail',
    text: 'Which sounds closest?',
    options: [
      { id: 'bloated', label: 'A bit bloated' },
      { id: 'not_sure', label: 'Not sure' },
    ],
    source: 'gemini',
  };

  it('uses the server wording and option labels as given', () => {
    expect(symptomStep(server)).toEqual({ text: 'Which sounds closest?', options: server.options });
  });

  it('falls back to the fixed copy when there is no question', () => {
    expect(symptomStep(null)).toEqual(FIXED_SYMPTOM_STEP);
  });

  it('ignores a question for any other intent', () => {
    expect(symptomStep({ ...server, intent: 'pre_existing' } as unknown as Question)).toEqual(
      FIXED_SYMPTOM_STEP,
    );
  });

  it('ignores options that cannot be submitted as a symptom', () => {
    const odd = { ...server, options: [{ id: 'yes', label: 'Yes' }] } as unknown as Question;
    expect(symptomStep(odd)).toEqual(FIXED_SYMPTOM_STEP);
    expect(symptomStep({ ...server, options: [] })).toEqual(FIXED_SYMPTOM_STEP);
  });
});

describe('pattern card view', () => {
  it('shows progress toward the weekly goal', () => {
    expect(patternView(card({ checkins: 3 }))).toEqual({
      kind: 'progress',
      fraction: 3 / 7,
      caption: '3 of 7 check-ins this week',
    });
  });

  it('keeps the progress fraction between 0 and 1', () => {
    expect(progressFraction(9, 7)).toBe(1);
    expect(progressFraction(-1, 7)).toBe(0);
    expect(progressFraction(2, 0)).toBe(0);
  });

  it('shows a kind note when there is no pattern yet', () => {
    expect(patternView(card({ state: 'no_pattern', checkins: 7 }))).toEqual({ kind: 'none' });
  });

  it('shows the server label with exact counts for a pattern', () => {
    expect(
      patternView(
        card({ state: 'pattern', checkins: 8, label: 'In your logs, ...', pattern: found }),
      ),
    ).toEqual({
      kind: 'finding',
      label: 'In your logs, ...',
      counts: ['3 of 4 meals in your logs'],
    });
  });

  it('adds the comparison count when the server sends one', () => {
    const view = patternView(
      card({
        state: 'pattern',
        label: 'L',
        pattern: { ...found, kind: 'dish', comparison: { matching: 1, total: 5 } },
      }),
    );
    expect(view).toEqual({
      kind: 'finding',
      label: 'L',
      counts: ['3 of 4 meals in your logs', '1 of 5 other meals'],
    });
  });

  it('shows a question card without counts when there is no pattern object', () => {
    expect(patternView(card({ state: 'question', label: 'Q' }))).toEqual({
      kind: 'finding',
      label: 'Q',
      counts: [],
    });
  });

  it('hides a card with an unknown state or no wording', () => {
    expect(patternView(card({ state: 'weird' as PatternCard['state'] }))).toBeNull();
    expect(patternView(card({ state: 'pattern', label: '' }))).toBeNull();
  });
});
