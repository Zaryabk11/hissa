import { expect, it } from 'vitest';
import { profilePayload } from './profilePayload';

it('maps onboarding answers to the profile contract without sending a client budget', () => {
  expect(profilePayload({ goal: 'lighter', sex: 'female', age: 28, heightIn: 67, weightKg: 72, activity: 'onFeet' }, 'Ayesha')).toEqual({
    displayName: 'Ayesha', goal: 'lose', sex: 'female', age: 28,
    heightCm: 170.18, weightKg: 72, activityLevel: 'light',
  });
});
