import { describe, expect, it } from 'vitest';
import { canSubmit, needsSymptomDetail, shouldAutoSubmit } from './feel-view';

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
