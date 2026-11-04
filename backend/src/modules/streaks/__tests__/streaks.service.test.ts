import { describe, expect, it, vi } from 'vitest';
import { computeStreak, createStreaksService } from '../streaks.service';
import type { StreaksRepository } from '../streaks.repository';

describe('computeStreak', () => {
  it.each([
    [['2026-11-03', '2026-11-04'], '2026-11-05', 2],
    [['2026-11-05'], '2026-11-05', 1],
    [['2026-11-03'], '2026-11-05', 0],
    [['2026-11-01', '2026-11-03', '2026-11-04', '2026-11-05'], '2026-11-05', 3],
    [[], '2026-11-05', 0],
  ])('%j on %s -> %i', (days, today, expected) => {
    expect(computeStreak(days, today)).toBe(expected);
    expect(computeStreak(new Set(days), today)).toBe(expected);
  });
});

function setup() {
  const repository = {
    markDay: vi.fn(async () => {}),
    daysFor: vi.fn(async () => ({ a: ['2026-11-04', '2026-11-05'] }) as Record<string, string[]>),
    loggedDays: vi.fn(async () => ['2026-11-04']),
  };
  return {
    service: createStreaksService({ repository: repository as unknown as StreaksRepository }),
    repository,
  };
}

describe('streaks service', () => {
  it('marks distinct PKT days across midnight', async () => {
    const { service, repository } = setup();
    await service.markMealSaved('u1', '2026-11-02T18:59:59Z');
    await service.markMealSaved('u1', '2026-11-02T19:00:00Z');
    expect(repository.markDay.mock.calls).toEqual([
      ['u1', '2026-11-02'],
      ['u1', '2026-11-03'],
    ]);
  });

  it('getStreaks makes one repository call and defaults missing ids', async () => {
    const { service, repository } = setup();
    const result = await service.getStreaks(['a', 'b'], new Date('2026-11-05T10:00:00Z'));
    expect(repository.daysFor).toHaveBeenCalledTimes(1);
    expect(repository.daysFor).toHaveBeenCalledWith(['a', 'b'], '2026-11-05');
    expect(result).toEqual({
      a: { streak: 2, loggedToday: true },
      b: { streak: 0, loggedToday: false },
    });
  });

  it('treats 19:00Z as the next PKT day', async () => {
    const { service, repository } = setup();
    const result = await service.getStreaks(['a'], new Date('2026-11-05T19:00:00Z'));
    expect(repository.daysFor).toHaveBeenCalledWith(['a'], '2026-11-06');
    expect(result.a).toEqual({ streak: 2, loggedToday: false });
  });

  it('loggedDays passes the range through', async () => {
    const { service, repository } = setup();
    expect(await service.loggedDays('a', '2026-11-01', '2026-11-05')).toEqual(['2026-11-04']);
    expect(repository.loggedDays).toHaveBeenCalledWith('a', '2026-11-01', '2026-11-05');
  });
});
