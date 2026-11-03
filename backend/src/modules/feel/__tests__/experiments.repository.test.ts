import { describe, expect, it } from 'vitest';
import type { Db } from '../../../shared/db';
import { createFeelRepository } from '../feel.repository';

// A chainable fake that records every call and resolves to one canned row.
function fakeDb(row: unknown) {
  const calls: [string, ...unknown[]][] = [];
  const chain: Record<string, unknown> = {};
  const record =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push([name, ...args]);
      return chain;
    };
  for (const m of ['select', 'insert', 'update', 'eq', 'order', 'limit']) chain[m] = record(m);
  const done = async () => ({ data: row, error: null });
  chain.single = done;
  chain.maybeSingle = done;
  return { db: { from: (t: string) => (calls.push(['from', t]), chain) } as unknown as Db, calls };
}
const dbRow = {
  id: 'e1',
  pattern_key: 'k',
  action: 'observe_again',
  status: 'active',
  created_at: 'c',
  tried_at: null,
  tried_meal_id: null,
};

describe('experiment queries are scoped to the user', () => {
  it.each([
    [
      'findExperiment',
      (r: ReturnType<typeof createFeelRepository>) => r.findExperiment('u1', 'e1'),
    ],
    [
      'findCurrentExperiment',
      (r: ReturnType<typeof createFeelRepository>) => r.findCurrentExperiment('u1'),
    ],
    [
      'markExperimentTried',
      (r: ReturnType<typeof createFeelRepository>) => r.markExperimentTried('u1', 'e1', 'm1', 't'),
    ],
    [
      'findMealSavedAt',
      (r: ReturnType<typeof createFeelRepository>) => r.findMealSavedAt('u1', 'm1'),
    ],
    [
      'findCheckinFeeling',
      (r: ReturnType<typeof createFeelRepository>) => r.findCheckinFeeling('u1', 'm1'),
    ],
  ])('%s filters on user_id', async (_name, run) => {
    const { db, calls } = fakeDb(dbRow);
    await run(createFeelRepository(db));
    expect(calls).toContainEqual(['eq', 'user_id', 'u1']);
  });

  it('markExperimentTried only touches an active row', async () => {
    const { db, calls } = fakeDb(dbRow);
    await createFeelRepository(db).markExperimentTried('u1', 'e1', 'm1', 't');
    expect(calls).toContainEqual(['eq', 'status', 'active']);
  });

  it('insertExperiment writes the caller as owner and maps the row without a user id', async () => {
    const { db, calls } = fakeDb(dbRow);
    const row = await createFeelRepository(db).insertExperiment('u1', 'k', 'observe_again');
    expect(calls).toContainEqual([
      'insert',
      { user_id: 'u1', pattern_key: 'k', action: 'observe_again' },
    ]);
    expect(row).toEqual({
      id: 'e1',
      patternKey: 'k',
      action: 'observe_again',
      status: 'active',
      createdAt: 'c',
      triedAt: null,
      triedMealId: null,
    });
  });
});
