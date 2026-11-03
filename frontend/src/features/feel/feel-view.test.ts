import { describe, expect, it } from 'vitest';
import { feelContent } from './content';
import {
  FIXED_SYMPTOM_STEP,
  experimentErrorMessage,
  latestMealIdAfter,
  offerablePatternKey,
  reviewLines,
  type Experiment,
  canSubmit,
  checkinBody,
  needsSymptomDetail,
  preExistingStep,
  shouldAskPreExisting,
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

const exp = (over: Partial<Experiment> = {}): Experiment => ({
  id: 'e1',
  patternKey: 'k',
  action: 'smaller_portion',
  status: 'active',
  createdAt: '2026-11-03T08:00:00.000Z',
  triedAt: null,
  tried: null,
  ...over,
});
const withPattern = card({ state: 'pattern', label: 'L', pattern: found });

describe('try next time offer', () => {
  it('offers the pattern key only for a pattern card', () => {
    expect(offerablePatternKey(withPattern, null)).toBe('k');
    expect(offerablePatternKey(card({ state: 'question', label: 'Q' }), null)).toBeNull();
    expect(offerablePatternKey(card({ state: 'no_pattern' }), null)).toBeNull();
    expect(offerablePatternKey(card({ state: 'pattern', label: 'L' }), null)).toBeNull();
    expect(offerablePatternKey(null, null)).toBeNull();
  });

  it('is hidden while an experiment is active and offered again once tried', () => {
    expect(offerablePatternKey(withPattern, exp())).toBeNull();
    expect(offerablePatternKey(withPattern, exp({ status: 'tried' }))).toBe('k');
  });
});

describe('meal chosen for "I tried it"', () => {
  const meal = (id: string, eatenAt: string) => ({ id, eatenAt });
  it('is null with no meals or only older ones', () => {
    expect(latestMealIdAfter([], exp().createdAt)).toBeNull();
    expect(latestMealIdAfter([meal('a', '2026-11-03T07:00:00.000Z')], exp().createdAt)).toBeNull();
  });
  it('picks the one later meal', () => {
    expect(latestMealIdAfter([meal('a', '2026-11-03T09:00:00.000Z')], exp().createdAt)).toBe('a');
  });
  it('picks the latest of several, in any order, ignoring older and bad times', () => {
    expect(
      latestMealIdAfter(
        [
          meal('old', '2026-11-03T07:00:00.000Z'),
          meal('late', '2026-11-03T13:00:00.000Z'),
          meal('bad', 'nope'),
          meal('mid', '2026-11-03T10:00:00.000Z'),
        ],
        exp().createdAt,
      ),
    ).toBe('late');
  });
});

describe('review text', () => {
  it('says the check-in is not done when both answers are missing', () => {
    expect(
      reviewLines(exp({ status: 'tried', tried: { mealId: 'm', energy: null, stomach: null } })),
    ).toEqual([feelContent.experiment.reviewPending]);
    expect(reviewLines(exp({ status: 'tried', tried: null }))).toEqual([
      feelContent.experiment.reviewPending,
    ]);
  });
  it('shows a partial answer plainly', () => {
    const lines = reviewLines(
      exp({ status: 'tried', tried: { mealId: 'm', energy: 'good', stomach: null } }),
    );
    expect(lines[0]).toBe('You logged: energy good for that meal.');
    expect(lines).toContain(feelContent.experiment.reviewNote);
  });
  it('shows both answers with the comparison note', () => {
    const lines = reviewLines(
      exp({ status: 'tried', tried: { mealId: 'm', energy: 'good', stomach: 'fine' } }),
    );
    expect(lines).toEqual([
      'You logged: energy good, stomach fine for that meal.',
      "One meal can't say why. This is just for you to compare.",
    ]);
  });
});

describe('experiment errors', () => {
  it('is kind about a conflict and a pattern that moved on', () => {
    expect(experimentErrorMessage(409)).toBe(feelContent.experiment.errors.conflict);
    expect(experimentErrorMessage(400)).toBe(feelContent.experiment.errors.invalid);
    expect(experimentErrorMessage(500)).toBe(feelContent.experiment.errors.generic);
    expect(experimentErrorMessage(undefined)).toBe(feelContent.experiment.errors.generic);
  });
});

describe('experiment copy', () => {
  it('never uses causal or medical wording', () => {
    const lines = [
      JSON.stringify(feelContent.experiment),
      ...reviewLines(
        exp({ status: 'tried', tried: { mealId: 'm', energy: 'low', stomach: 'heavy' } }),
      ),
      ...reviewLines(exp({ status: 'tried' })),
    ];
    for (const line of lines) expect(line).not.toMatch(/cause|because|diagnos|avoid|intoleran/i);
  });
});

// The server's canonical pre_existing question (GET /api/feel/question/:id?stomach=heavy&after=symptom_detail).
const preQuestion: Question = {
  mealId: 'm1',
  intent: 'pre_existing',
  text: 'Did you already feel this way before this meal?',
  options: [
    { id: 'yes', label: 'Yes' },
    { id: 'no', label: 'No' },
    { id: 'not_sure', label: 'Not sure' },
  ],
  source: 'fallback',
};

describe('pre_existing follow-up step', () => {
  it('comes after the symptom step, only for a heavy stomach', () => {
    expect(shouldAskPreExisting('heavy', 'bloated')).toBe(true);
    expect(shouldAskPreExisting('heavy', undefined)).toBe(false); // symptom step not answered yet
    expect(shouldAskPreExisting('fine', 'bloated')).toBe(false);
    expect(shouldAskPreExisting('light', 'bloated')).toBe(false);
    expect(shouldAskPreExisting(null, 'bloated')).toBe(false);
  });

  it('shows the server copy with its three canonical options', () => {
    expect(preExistingStep(preQuestion)).toEqual({
      text: preQuestion.text,
      options: preQuestion.options,
    });
  });

  it('is absent (today’s flow) for no question, another intent or odd options', () => {
    expect(preExistingStep(null)).toBeNull();
    expect(
      preExistingStep({ ...preQuestion, intent: 'symptom_detail' } as unknown as Question),
    ).toBeNull();
    expect(preExistingStep({ ...preQuestion, text: ' ' })).toBeNull();
    expect(preExistingStep({ ...preQuestion, options: [] })).toBeNull();
    expect(
      preExistingStep({ ...preQuestion, options: [{ id: 'bloated', label: 'Bloated' }] }),
    ).toBeNull();
    expect(preExistingStep({ ...preQuestion, options: [{ id: 'yes', label: '' }] })).toBeNull();
  });

  it('never uses causal, medical or advice wording', () => {
    const copy = [preQuestion.text, ...preQuestion.options.map((o) => o.label)].join(' ');
    expect(copy).not.toMatch(/cause|because|diagnos|avoid|intoleran|doctor|allerg|disease/i);
  });
});

describe('check-in payload', () => {
  const base = { mealId: 'm1', energy: 'okay' as const };
  it('is today’s two-answer body for a fine stomach, whatever else was tapped', () => {
    expect(
      checkinBody({ ...base, stomach: 'fine', symptom: 'bloated', preExisting: 'yes' }),
    ).toEqual({ mealId: 'm1', energy: 'okay', stomach: 'fine' });
  });
  it('adds the symptom for heavy, and the pair only when the follow-up was answered', () => {
    expect(checkinBody({ ...base, stomach: 'heavy', symptom: 'upset' })).toEqual({
      mealId: 'm1',
      energy: 'okay',
      stomach: 'heavy',
      symptom: 'upset',
    });
    expect(
      checkinBody({ ...base, stomach: 'heavy', symptom: 'upset', preExisting: 'not_sure' }),
    ).toEqual({
      mealId: 'm1',
      energy: 'okay',
      stomach: 'heavy',
      symptom: 'upset',
      questionType: 'pre_existing',
      answerId: 'not_sure',
    });
  });
  it('skipping the follow-up sends no pair, and no pair without a symptom', () => {
    expect(checkinBody({ ...base, stomach: 'heavy' })).toEqual({
      mealId: 'm1',
      energy: 'okay',
      stomach: 'heavy',
    });
    expect(checkinBody({ ...base, stomach: 'heavy', preExisting: 'yes' })).not.toHaveProperty(
      'questionType',
    );
  });
});
