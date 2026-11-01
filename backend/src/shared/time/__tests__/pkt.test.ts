import { describe, expect, it } from 'vitest';
import { pktDay, pktDayBounds } from '../pkt';

describe('pktDay', () => {
  it('is still the same PKT day one second before 19:00Z', () => {
    expect(pktDay(new Date('2026-11-01T18:59:59Z'))).toBe('2026-11-01');
  });

  it('rolls over to the next PKT day at 19:00Z', () => {
    expect(pktDay(new Date('2026-11-01T19:00:00Z'))).toBe('2026-11-02');
  });
});

describe('pktDayBounds', () => {
  it('returns the UTC instants bounding the PKT day', () => {
    expect(pktDayBounds('2026-11-02')).toEqual({
      startIso: '2026-11-01T19:00:00.000Z',
      endIso: '2026-11-02T19:00:00.000Z',
    });
  });
});
