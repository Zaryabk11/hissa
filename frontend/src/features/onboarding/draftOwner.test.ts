import { expect, it } from 'vitest';
import { canUseDraft } from './draftOwner';

it('never applies another signed-in account’s onboarding answers', () => {
  expect(canUseDraft(true, 'user-a', 'user-b')).toBe(false);
  expect(canUseDraft(true, 'user-a', 'user-a')).toBe(true);
  expect(canUseDraft(true, null, 'user-b')).toBe(true); // anonymous draft, claimed at first sign-in
  expect(canUseDraft(false, null, 'user-b')).toBe(false);
});
