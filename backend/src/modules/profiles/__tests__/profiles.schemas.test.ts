import { describe, expect, it } from 'vitest';
import { profileBodySchema } from '../profiles.schemas';

const valid = {
  goal: 'maintain',
  sex: 'female',
  age: 25,
  heightCm: 160,
  weightKg: 60,
  activityLevel: 'sedentary',
};

describe('profileBodySchema', () => {
  it('accepts a valid body, trims displayName and drops a client-supplied budget', () => {
    const r = profileBodySchema.safeParse({
      ...valid,
      displayName: '  Ayesha ',
      dailyCalorieBudget: 9999,
    });
    expect(r.success).toBe(true);
    expect(r.data).toEqual({ ...valid, displayName: 'Ayesha' });
  });

  it.each([
    ['invalid goal', { goal: 'bulk' }],
    ['age 9', { age: 9 }],
    ['age 121', { age: 121 }],
    ['heightCm 0', { heightCm: 0 }],
    ['weightKg -1', { weightKg: -1 }],
  ])('rejects %s', (_name, patch) => {
    expect(profileBodySchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });
});
