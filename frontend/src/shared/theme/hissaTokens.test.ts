import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ Dimensions: { get: () => ({ width: 390, height: 844 }) } }));

const { dhoop, pickTheme, raat } = await import('./hissaTokens');

describe('pickTheme', () => {
  it('maps light to Dhoop and dark or unknown to Raat', () => {
    expect(pickTheme('light')).toBe(dhoop);
    expect(pickTheme('dark')).toBe(raat);
    expect(pickTheme(null)).toBe(raat);
  });
  it('lets a forced theme win', () => {
    expect(pickTheme('light', raat)).toBe(raat);
  });
});
