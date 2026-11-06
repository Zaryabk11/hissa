import { describe, expect, it, vi } from 'vitest';
import { createSnapStorageClient } from '../snap-storage.client';

// A fake bucket whose list() pages over a fixed, name-sorted set of entries.
function bucketWith(entries: { name: string; created_at: string | null }[]) {
  const list = vi.fn(async (_prefix: string, opts: { limit: number; offset: number }) => ({
    data: entries.slice(opts.offset, opts.offset + opts.limit),
    error: null,
  }));
  const from = vi.fn(() => ({ list }));
  return { db: { storage: { from } } as never, list, from };
}

describe('snap storage client listings', () => {
  const old = '2026-11-01T00:00:00Z';
  const young = '2026-11-06T00:00:00Z';
  const cutoff = new Date('2026-11-05T00:00:00Z');
  const entries = Array.from({ length: 1003 }, (_, i) => ({
    name: `${String(i).padStart(4, '0')}.jpg`,
    created_at: i % 2 ? young : old,
  }));

  it('pages snaps with a stable name sort until a short page', async () => {
    const { db, list, from } = bucketWith([...entries, { name: 'folder', created_at: null }]);
    const out = await createSnapStorageClient(db).listOlderThan(cutoff);
    expect(from).toHaveBeenCalledWith('snaps');
    expect(list).toHaveBeenCalledTimes(2);
    for (const [, opts] of list.mock.calls)
      expect(opts).toMatchObject({ sortBy: { column: 'name', order: 'asc' } });
    expect(out).toHaveLength(502);
    expect(out).toContain('1002.jpg');
  });

  it('lists snap-reports the same way', async () => {
    const { db, from } = bucketWith(entries.slice(0, 3));
    const out = await createSnapStorageClient(db).listReportsOlderThan(cutoff);
    expect(from).toHaveBeenCalledWith('snap-reports');
    expect(out).toEqual(['0000.jpg', '0002.jpg']);
  });
});
