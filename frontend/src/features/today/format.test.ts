import { expect, it } from 'vitest';
import { dayLabel } from './format';

it('labels the API day without a time zone shift', () => {
  expect(dayLabel('2026-11-03')).toBe('Tuesday, 3 Nov');
  expect(dayLabel('nonsense')).toBe('nonsense');
});
