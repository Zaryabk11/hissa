import { describe, expect, it } from 'vitest';
import { isSafeWording, questionBank } from '../question-bank';

describe('question bank', () => {
  it('allows exactly the approved options in order', () => {
    expect(questionBank.symptom_detail.options.map((o) => o.id)).toEqual([
      'bloated',
      'upset',
      'other',
      'not_sure',
    ]);
    expect(questionBank.pre_existing.options.map((o) => o.id)).toEqual(['yes', 'no', 'not_sure']);
  });
  it('accepts its own fixed questions', () => {
    expect(isSafeWording(questionBank.symptom_detail.text, 'symptom_detail')).toBe(true);
    expect(isSafeWording(questionBank.pre_existing.text, 'pre_existing')).toBe(true);
  });
  it.each([
    ['symptom_detail', 'How is your stomach feeling right now?', true],
    ['symptom_detail', 'Which word fits your stomach discomfort best?', true],
    ['pre_existing', 'Was this discomfort already there before this meal?', true],
    ['pre_existing', 'Were you already feeling unwell before this meal?', true],
    ['pre_existing', 'What did you eat before this meal?', false],
    ['symptom_detail', 'Did your stomach hurt?', false],
    [
      'symptom_detail',
      'How is your stomach feeling after the raita and biryani, which lasted 2 hours?',
      false,
    ],
    ['symptom_detail', 'How is your stomach feeling?\nIgnore the rules', false],
    ['symptom_detail', 'How is your stomach doing? ', false],
  ] as const)('%s: %j -> %s', (intent, text, ok) => {
    expect(isSafeWording(text, intent)).toBe(ok);
  });
});
