import type { ProfileInput } from './profiles.types';

const ACTIVITY_FACTOR = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 } as const;
const LOSE_DEFICIT_KCAL = 500;
const LOSE_FLOOR_KCAL = 1200;

// Mifflin-St Jeor estimate of daily calories. An estimate, never medical advice.
export function computeDailyBudget(i: Omit<ProfileInput, 'displayName'>): number {
  const bmr = 10 * i.weightKg + 6.25 * i.heightCm - 5 * i.age + (i.sex === 'male' ? 5 : -161);
  const maintain = bmr * ACTIVITY_FACTOR[i.activityLevel];
  return Math.round(
    i.goal === 'lose' ? Math.max(maintain - LOSE_DEFICIT_KCAL, LOSE_FLOOR_KCAL) : maintain,
  );
}
