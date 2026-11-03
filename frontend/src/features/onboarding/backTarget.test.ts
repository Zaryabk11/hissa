import { describe, expect, it } from 'vitest';
import { backFallback } from './backTarget';

describe('backFallback', () => {
  it('goes to the landing page on the web', () => expect(backFallback('web')).toBe('/landing'));
  it('lets the index redirector decide on native', () => {
    expect(backFallback('ios')).toBe('/');
    expect(backFallback('android')).toBe('/');
  });
});
