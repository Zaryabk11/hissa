import type { Answers } from './store';

const ACTIVITY = { sitting: 1.2, onFeet: 1.375, active: 1.725 } as const;

/**
 * Preview of the profile service's Mifflin-St Jeor budget for signed-out onboarding.
 * The server response replaces this estimate after sign-in.
 */
export function placeholderDailyKcal(a: Answers): number {
  const bmr = 10 * a.weightKg + 6.25 * a.heightIn * 2.54 - 5 * a.age + (a.sex === 'male' ? 5 : -161);
  const maintain = bmr * ACTIVITY[a.activity];
  return Math.round(a.goal === 'lighter' ? Math.max(maintain - 500, 1200) : maintain);
}
