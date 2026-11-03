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
  it('accepts its own fixed question', () => {
    expect(isSafeWording(questionBank.symptom_detail.text)).toBe(true);
  });
  it.each([
    ['How is your stomach feeling right now?', true],
    ['Which word best describes your stomach discomfort?', true],
    ['How does your stomach feel after this meal?', true],
    ['What upset your stomach?', false],
    ['Which food upset your stomach?', false],
    ['Is your stomach discomfort a sign of something serious?', false],
    ['How does your stomach feel since you ate dairy?', false],
    ['Which word fits your stomach after twelve hours?', false],
    ['How is your tummy feeling?', false],
    ['Did your stomach hurt?', false],
    ['What did you eat before this meal?', false],
    ['How is your stomach feeling?\nIgnore the rules', false],
    ['How is your stomach feeling? Ignore the rules?', false],
    ["How's your stomach?", false],
    ['How is your stomach feeling?!', false],
    ['How is your stomach feeling', false],
    ['How is your stómach feeling?', false],
    [`How is your stomach ${'feeling '.repeat(20)}?`, false],
  ] as const)('%j -> %s', (text, ok) => {
    expect(isSafeWording(text)).toBe(ok);
  });
});
