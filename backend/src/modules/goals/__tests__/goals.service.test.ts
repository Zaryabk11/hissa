import { describe, expect, it, vi } from 'vitest';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors';
import { createGoalsService } from '../goals.service';
import type { GoalRow } from '../goals.types';

const NOW = new Date('2026-11-04T10:00:00Z'); // PKT day 2026-11-04
const row = (over: Partial<GoalRow> = {}): GoalRow => ({
  id: 'g1',
  user_id: 'me',
  type: 'streak',
  target: 2,
  window_days: null,
  start_day: '2026-11-04',
  status: 'active',
  shared: true,
  reached_at: null,
  ...over,
});

function setup(opts: { active?: GoalRow | null; logged?: string[]; friends?: string[] } = {}) {
  const repository = {
    findActive: vi.fn(async () => opts.active ?? null),
    findReachedBetween: vi.fn(async () => null as GoalRow | null),
    findById: vi.fn(async () => null as GoalRow | null),
    insert: vi.fn(async (userId: string, g: { startDay: string }) =>
      row({ user_id: userId, start_day: g.startDay }),
    ),
    markReached: vi.fn(async () => true),
    markExpired: vi.fn(async () => {}),
    updateActive: vi.fn(async () => {}),
    reachedSharedSince: vi.fn(async () => [] as GoalRow[]),
    cheersFor: vi.fn(async () => [] as { goal_id: string; user_id: string }[]),
    insertCheer: vi.fn(async () => true),
  };
  const streaks = { loggedDays: vi.fn(async () => opts.logged ?? []) };
  const friends = {
    friendIds: vi.fn(async () => opts.friends ?? []),
    areFriends: vi.fn(async (_a: string, b: string) => (opts.friends ?? []).includes(b)),
  };
  const notifications = { notify: vi.fn(async () => {}) };
  const profiles = {
    getCards: vi.fn(async (ids: string[]) =>
      ids.map((userId) => ({ userId, username: `n_${userId}`, displayName: userId })),
    ),
  };
  const service = createGoalsService({
    repository,
    streaks,
    friends,
    notifications,
    profiles,
  } as never);
  return { service, repository, streaks, friends, notifications };
}

describe('GoalsService.create', () => {
  it('rejects while an active goal exists', async () => {
    const { service, repository } = setup({ active: row({ start_day: '2026-11-04' }) });
    await expect(
      service.create('me', { type: 'streak', target: 3, shared: false }, NOW),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it('succeeds once the active goal window has elapsed (settled to expired)', async () => {
    const old = row({ type: 'window', target: 5, window_days: 3, start_day: '2026-11-01' });
    const { service, repository } = setup({ active: old, logged: ['2026-11-01'] });
    const g = await service.create('me', { type: 'streak', target: 3, shared: false }, NOW);
    expect(repository.markExpired).toHaveBeenCalledWith('g1');
    expect(repository.insert).toHaveBeenCalledWith('me', {
      type: 'streak',
      target: 3,
      windowDays: null,
      startDay: '2026-11-04',
      shared: false,
    });
    expect(g).toMatchObject({ progress: 0, status: 'active', title: 'Log 2 days in a row' });
  });

  it('maps the unique-index race to a conflict', async () => {
    const { service, repository } = setup();
    repository.insert.mockRejectedValueOnce({ code: '23505' });
    await expect(
      service.create('me', { type: 'streak', target: 3, shared: false }, NOW),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

describe('GoalsService.getMine', () => {
  it('returns the active goal with computed progress', async () => {
    const { service, streaks } = setup({ active: row({ target: 3 }), logged: ['2026-11-04'] });
    expect(await service.getMine('me', NOW)).toMatchObject({ progress: 1, status: 'active' });
    expect(streaks.loggedDays).toHaveBeenCalledWith('me', '2026-11-04', '2026-11-04');
  });

  it('falls back to a goal reached today, else null', async () => {
    const { service, repository } = setup();
    expect(await service.getMine('me', NOW)).toBeNull();
    repository.findReachedBetween.mockResolvedValueOnce(
      row({ status: 'reached', reached_at: NOW.toISOString() }),
    );
    expect(await service.getMine('me', NOW)).toMatchObject({ status: 'reached', progress: 2 });
  });
});

describe('GoalsService.onMealSaved', () => {
  it('marks reached once and notifies each friend if shared', async () => {
    const { service, repository, notifications } = setup({
      active: row(),
      logged: ['2026-11-04', '2026-11-05'],
      friends: ['a', 'b'],
    });
    await service.onMealSaved('me', new Date('2026-11-05T10:00:00Z'));
    expect(repository.markReached).toHaveBeenCalledTimes(1);
    expect(notifications.notify).toHaveBeenCalledTimes(2);
    expect(notifications.notify).toHaveBeenCalledWith({
      userId: 'a',
      kind: 'goal_reached',
      actorId: 'me',
      goalId: 'g1',
    });
  });

  it('notifies nobody when the conditional update affects no row (concurrent save)', async () => {
    const { service, repository, notifications } = setup({
      active: row(),
      logged: ['2026-11-04', '2026-11-05'],
      friends: ['a'],
    });
    repository.markReached.mockResolvedValueOnce(false);
    await service.onMealSaved('me', new Date('2026-11-05T10:00:00Z'));
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('marks a non-shared goal reached without notifying', async () => {
    const { service, repository, notifications, friends } = setup({
      active: row({ shared: false }),
      logged: ['2026-11-04', '2026-11-05'],
      friends: ['a'],
    });
    await service.onMealSaved('me', new Date('2026-11-05T10:00:00Z'));
    expect(repository.markReached).toHaveBeenCalledTimes(1);
    expect(friends.friendIds).not.toHaveBeenCalled();
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('does nothing before the target, and settles an expired goal', async () => {
    const a = setup({ active: row(), logged: ['2026-11-04'] });
    await a.service.onMealSaved('me', NOW);
    expect(a.repository.markReached).not.toHaveBeenCalled();
    const b = setup({
      active: row({ type: 'window', target: 5, window_days: 2, start_day: '2026-11-01' }),
      logged: ['2026-11-04'],
    });
    await b.service.onMealSaved('me', NOW);
    expect(b.repository.markExpired).toHaveBeenCalledWith('g1');
    expect(b.repository.markReached).not.toHaveBeenCalled();
  });

  it('does nothing without an active goal', async () => {
    const { service, streaks } = setup();
    await service.onMealSaved('me', NOW);
    expect(streaks.loggedDays).not.toHaveBeenCalled();
  });
});

describe('GoalsService.celebrations', () => {
  it('covers only current friends shared goals reached in the last 48h', async () => {
    const { service, repository } = setup({ friends: ['a'] });
    repository.reachedSharedSince.mockResolvedValueOnce([
      row({ id: 'g9', user_id: 'a', status: 'reached', reached_at: '2026-11-03T08:00:00Z' }),
    ]);
    repository.cheersFor.mockResolvedValueOnce([
      { goal_id: 'g9', user_id: 'me' },
      { goal_id: 'g9', user_id: 'a' },
      { goal_id: 'g9', user_id: 'gone' },
    ]);
    const list = await service.celebrations('me', NOW);
    expect(repository.reachedSharedSince).toHaveBeenCalledWith(['a'], '2026-11-02T10:00:00.000Z');
    expect(list).toEqual([
      {
        goalId: 'g9',
        actor: { userId: 'a', username: 'n_a', displayName: 'a' },
        title: 'Log 2 days in a row',
        reachedAt: '2026-11-03T08:00:00Z',
        cheers: 2, // 'gone' is no longer a friend of the viewer
        cheeredByMe: true,
      },
    ]);
  });

  it('is empty with no friends, without querying goals', async () => {
    const { service, repository } = setup();
    expect(await service.celebrations('me', NOW)).toEqual([]);
    expect(repository.reachedSharedSince).not.toHaveBeenCalled();
  });
});

describe('GoalsService.cheer', () => {
  const shared = row({ id: 'g9', user_id: 'a', status: 'reached', shared: true });

  it('rejects a non-friend with 404 and an unknown or unshared goal with 404', async () => {
    const { service, repository } = setup({ friends: [] });
    repository.findById.mockResolvedValue(shared);
    await expect(service.cheer('me', 'g9')).rejects.toBeInstanceOf(NotFoundError);
    const f = setup({ friends: ['a'] });
    f.repository.findById.mockResolvedValue({ ...shared, shared: false });
    await expect(f.service.cheer('me', 'g9')).rejects.toBeInstanceOf(NotFoundError);
    const g = setup({ friends: ['a'] });
    await expect(g.service.cheer('me', 'nope')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects cheering your own goal with 400', async () => {
    const { service, repository } = setup({ friends: ['a'] });
    repository.findById.mockResolvedValue({ ...shared, user_id: 'me' });
    await expect(service.cheer('me', 'g9')).rejects.toBeInstanceOf(ValidationError);
  });

  it('notifies the achiever on the first cheer only', async () => {
    const { service, repository, notifications } = setup({ friends: ['a'] });
    repository.findById.mockResolvedValue(shared);
    await service.cheer('me', 'g9');
    expect(notifications.notify).toHaveBeenCalledWith({
      userId: 'a',
      kind: 'cheer',
      actorId: 'me',
      goalId: 'g9',
    });
    repository.insertCheer.mockResolvedValueOnce(false);
    await service.cheer('me', 'g9');
    expect(notifications.notify).toHaveBeenCalledTimes(1);
  });
});

describe('GoalsService.update', () => {
  it('abandon sets abandoned on the callers goal and returns null', async () => {
    const { service, repository } = setup({ active: row() });
    expect(await service.update('me', { abandon: true }, NOW)).toBeNull();
    expect(repository.updateActive).toHaveBeenCalledWith('me', { status: 'abandoned' });
  });

  it('shared only touches the callers active goal', async () => {
    const { service, repository } = setup({ active: row({ shared: false }), logged: [] });
    const g = await service.update('me', { shared: true }, NOW);
    expect(repository.updateActive).toHaveBeenCalledWith('me', { shared: true });
    expect(g).toMatchObject({ shared: true });
  });

  it('returns null and writes nothing without an active goal', async () => {
    const { service, repository } = setup();
    expect(await service.update('me', { shared: true }, NOW)).toBeNull();
    expect(repository.updateActive).not.toHaveBeenCalled();
  });
});
