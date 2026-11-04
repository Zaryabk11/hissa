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

  it('accepts macro targets 1..1000 or null and rejects 0, 1001 and decimals', () => {
    expect(profileBodySchema.safeParse({ ...valid, proteinTargetG: 90, fatTargetG: null }).success).toBe(true);
    for (const bad of [0, 1001, 50.5])
      expect(profileBodySchema.safeParse({ ...valid, carbsTargetG: bad }).success).toBe(false);
  });

  it.each([
    ['invalid goal', { goal: 'bulk' }],
    ['age 9', { age: 9 }],
    ['age 121', { age: 121 }],
    ['heightCm 0', { heightCm: 0 }],
    ['weightKg -1', { weightKg: -1 }],
    ['displayName of 81 characters', { displayName: 'a'.repeat(81) }],
  ])('rejects %s', (_name, patch) => {
    expect(profileBodySchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });

  it('accepts a displayName of exactly 80 characters', () => {
    expect(profileBodySchema.safeParse({ ...valid, displayName: 'a'.repeat(80) }).success).toBe(
      true,
    );
  });

  it.each(['goal', 'sex', 'age', 'heightCm', 'weightKg', 'activityLevel'])(
    'rejects a body missing %s',
    (field) => {
      const body = Object.fromEntries(Object.entries(valid).filter(([k]) => k !== field));
      expect(profileBodySchema.safeParse(body).success).toBe(false);
    },
  );
});
