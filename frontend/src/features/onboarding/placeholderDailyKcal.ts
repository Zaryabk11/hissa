import type { Answers } from './store';

const ACTIVITY = { sitting: 1.2, onFeet: 1.375, active: 1.55 } as const;
const GOAL = { lighter: 0.85, steady: 1, strength: 1.1 } as const;

/**
 * PLACEHOLDER, not the real budget model: Mifflin-St Jeor x activity x goal, rounded to 50.
 * Replace with the backend's calculation. Always shown to users as an estimate.
 */
export function placeholderDailyKcal(a: Answers): number {
  const bmr = 10 * a.weightKg + 6.25 * a.heightIn * 2.54 - 5 * a.age + (a.sex === 'male' ? 5 : -161);
  return Math.round((bmr * ACTIVITY[a.activity] * GOAL[a.goal]) / 50) * 50;
}
