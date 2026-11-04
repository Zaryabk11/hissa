import { expect, it } from 'vitest';
import { placeholderDailyKcal } from './placeholderDailyKcal';

it('previews the same estimated budget as the profile service for onboarding answers', () => {
  expect(placeholderDailyKcal({ goal: 'lighter', sex: 'male', age: 28, heightIn: 67, weightKg: 72, activity: 'onFeet', avoids: { proteins: [], dishes: [] } })).toBe(1767);
});
