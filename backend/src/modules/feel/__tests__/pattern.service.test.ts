import { describe, expect, it, vi } from 'vitest';
import { createFeelService } from '../feel.service';
import type { FeelRepository } from '../feel.repository';
import type { Observation } from '../feel.types';

const NOW = new Date('2026-11-03T10:00:00Z'); // 15:00 PKT on 2026-11-03; window 2026-10-28..2026-11-03
const HOUR = 3_600_000;
let seq = 0;
function row(userId: string, o: Partial<Observation> = {}): Observation {
  seq += 1;
  const eaten = new Date(NOW.getTime() - (seq + 1) * 2 * HOUR);
  return {
    userId,
    mealId: `m${seq}`,
    eatenAt: eaten.toISOString(),
    checkedInAt: new Date(eaten.getTime() + 2 * HOUR).toISOString(),
    dishes: [{ slug: 'biryani', category: 'rice' }],
    energy: 'okay',
    stomach: 'heavy',
    symptom: null,
    answerId: null,
    questionType: null,
    ...o,
  };
}
function setup(rows: Observation[]) {
  const listObservations = vi.fn(async () => rows);
  const repository = { listObservations } as unknown as FeelRepository;
  const service = createFeelService({
    repository,
    questionClient: { draft: async () => ({ text: '', optionIds: [] }) },
  });
  return { service, listObservations };
}

describe('getWeeklyPattern', () => {
  it('builds a real (not sample) card from the caller’s own check-ins only', async () => {
    const mine = Array.from({ length: 7 }, () => row('owner'));
    const theirs = Array.from({ length: 5 }, () => row('other', { stomach: 'fine' }));
    const { service, listObservations } = setup([...mine, ...theirs]);
    const card = await service.getWeeklyPattern('owner', NOW);
    expect(listObservations).toHaveBeenCalledWith('owner');
    expect(card).toMatchObject({
      state: 'pattern',
      isSample: false,
      checkins: 7,
      needed: 7,
      window: { from: '2026-10-28', to: '2026-11-03' },
    });
    expect(card.pattern).toMatchObject({ kind: 'category', subject: 'rice', matching: 7 });
  });

  it('does not count a check-in made over 24 hours after its meal', async () => {
    const rows = [
      ...Array.from({ length: 6 }, () => row('owner')),
      row('owner', {
        checkedInAt: new Date(NOW.getTime() - HOUR).toISOString(),
        eatenAt: new Date(NOW.getTime() - 26 * HOUR).toISOString(),
      }),
    ];
    const card = await setup(rows).service.getWeeklyPattern('owner', NOW);
    expect(card).toMatchObject({ state: 'insufficient_data', checkins: 6 });
  });

  it('keys the week on when the meal was eaten, not when it was checked in', async () => {
    // Eaten 23:00 PKT on 2026-10-27 (before the window), checked in the next morning (inside it).
    const eaten = new Date('2026-10-27T18:00:00Z');
    const early = row('owner', {
      eatenAt: eaten.toISOString(),
      checkedInAt: new Date(eaten.getTime() + 8 * HOUR).toISOString(),
    });
    const rows = [...Array.from({ length: 6 }, () => row('owner')), early];
    expect((await setup(rows).service.getWeeklyPattern('owner', NOW)).checkins).toBe(6);
  });

  it('returns progress for a user with no check-ins', async () => {
    expect(await setup([]).service.getWeeklyPattern('owner', NOW)).toMatchObject({
      state: 'insufficient_data',
      checkins: 0,
      isSample: false,
      pattern: null,
    });
  });
});

describe('isSample', () => {
  const mk = (demoUserId?: string) =>
    createFeelService({
      repository: {
        listObservations: vi.fn(async (u: string) => Array.from({ length: 7 }, () => row(u))),
      } as unknown as FeelRepository,
      questionClient: { draft: async () => ({ text: '', optionIds: [] }) },
      demoUserId,
    });
  it('is true only for the configured demo user', async () => {
    const service = mk('demo');
    expect((await service.getWeeklyPattern('demo', NOW)).isSample).toBe(true);
    expect((await service.getWeeklyPattern('someone-else', NOW)).isSample).toBe(false);
  });
  it('is always false when no demo user is configured', async () => {
    expect((await mk().getWeeklyPattern('demo', NOW)).isSample).toBe(false);
  });
});
