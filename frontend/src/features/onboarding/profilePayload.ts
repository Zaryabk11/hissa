import type { Answers } from './store';

export function profilePayload(answers: Answers, displayName?: string) {
  return {
    ...(displayName ? { displayName } : {}),
    goal: answers.goal === 'lighter' ? 'lose' as const : 'maintain' as const,
    sex: answers.sex,
    age: answers.age,
    heightCm: Math.round(answers.heightIn * 2.54 * 100) / 100,
    weightKg: answers.weightKg,
    activityLevel: answers.activity === 'sitting' ? 'sedentary' as const : answers.activity === 'onFeet' ? 'light' as const : 'active' as const,
  };
}
