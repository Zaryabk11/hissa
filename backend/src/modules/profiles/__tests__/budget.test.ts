import { describe, expect, it } from 'vitest';
import { computeDailyBudget } from '../budget';

const female = {
  sex: 'female',
  age: 25,
  heightCm: 160,
  weightKg: 60,
  activityLevel: 'sedentary',
} as const;
const male = {
  sex: 'male',
  age: 30,
  heightCm: 175,
  weightKg: 80,
  activityLevel: 'moderate',
} as const;

describe('computeDailyBudget', () => {
  it('maintain: Mifflin-St Jeor times activity factor, rounded', () => {
    expect(computeDailyBudget({ ...female, goal: 'maintain' })).toBe(1577);
    expect(computeDailyBudget({ ...male, goal: 'maintain' })).toBe(2711);
  });

  it('lose: subtracts 500 kcal with a floor of 1200', () => {
    expect(computeDailyBudget({ ...female, goal: 'lose' })).toBe(1200);
    expect(computeDailyBudget({ ...male, goal: 'lose' })).toBe(2211);
  });
});
