import { describe, expect, it, vi } from 'vitest';
import type { Db } from '../../../shared/db';
import { createStreaksRepository } from '../streaks.repository';

function fakeDb(pages: { user_id: string; day: string }[][]) {
  const range = vi.fn(async () => ({ data: pages.shift() ?? [], error: null }));
  const chain: Record<string, unknown> = { range };
  for (const m of ['select', 'in', 'gte', 'lte', 'order']) chain[m] = vi.fn(() => chain);
  return { db: { from: vi.fn(() => chain) } as unknown as Db, range, chain };
}

describe('streaks repository daysFor', () => {
  it('pages past the 1000 row cap and merges both pages', async () => {
    const first = Array.from({ length: 1000 }, (_, i) => ({
      user_id: 'a',
      day: `d${String(i).padStart(4, '0')}`,
    }));
    const { db, range } = fakeDb([first, [{ user_id: 'b', day: '2026-11-05' }]]);
    const out = await createStreaksRepository(db).daysFor(['a', 'b'], '2026-11-05');
    expect(range.mock.calls).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
    expect(out.a).toHaveLength(1000);
    expect(out.b).toEqual(['2026-11-05']);
  });

  it('stops after a short first page', async () => {
    const { db, range } = fakeDb([[{ user_id: 'a', day: '2026-11-05' }]]);
    await createStreaksRepository(db).daysFor(['a'], '2026-11-05');
    expect(range).toHaveBeenCalledTimes(1);
  });
});
