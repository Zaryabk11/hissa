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

function setup(
  opts: {
    active?: GoalRow | null;
    logged?: string[];
    friends?: string[];
    friendsOf?: Record<string, string[]>;
  } = {},
) {
  const repository = {
    findActive: vi.fn(async () => opts.active ?? null),
    findReachedBetween: vi.fn(async () => null as GoalRow | null),
    findById: vi.fn(async () => null as GoalRow | null),
    insert: vi.fn(
      async (
        userId: string,
        g: {
          type: 'streak' | 'window';
          target: number;
          windowDays: number | null;
          startDay: string;
          shared: boolean;
        },
      ) =>
        row({
          user_id: userId,
          type: g.type,
          target: g.target,
          window_days: g.windowDays,
          start_day: g.startDay,
          shared: g.shared,
        }),
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
    friendIds: vi.fn(async (id: string) =>
      id === 'me' ? (opts.friends ?? []) : (opts.friendsOf?.[id] ?? []),
    ),
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
    expect(g).toMatchObject({ progress: 0, status: 'active', title: 'Log 3 days in a row' });
  });

  it('returns the real progress when today is already logged', async () => {
    const { service, repository } = setup({ logged: ['2026-11-04'] });
    const g = await service.create('me', { type: 'streak', target: 3, shared: false }, NOW);
    expect(g).toMatchObject({ progress: 1, status: 'active' });
    expect(repository.markReached).not.toHaveBeenCalled();
  });

  it('marks a goal reached at creation and notifies friends if shared', async () => {
    const { service, repository, notifications } = setup({
      logged: ['2026-11-04'],
      friends: ['a'],
    });
    const g = await service.create(
      'me',
      { type: 'window', target: 1, windowDays: 3, shared: true },
      NOW,
    );
    expect(g).toMatchObject({ progress: 1, status: 'reached' });
    expect(repository.markReached).toHaveBeenCalledTimes(1);
    expect(notifications.notify).toHaveBeenCalledWith({
      userId: 'a',
      kind: 'goal_reached',
      actorId: 'me',
      goalId: 'g1',
    });
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

describe('self-healing a met goal that was never marked reached', () => {
  const met = () => setup({ active: row(), logged: ['2026-11-04', '2026-11-05'], friends: ['a'] });
  const later = new Date('2026-11-05T10:00:00Z');

  it('getMine settles it to reached and notifies once', async () => {
    const { service, repository, notifications } = met();
    expect(await service.getMine('me', later)).toMatchObject({ status: 'reached', progress: 2 });
    expect(repository.markReached).toHaveBeenCalledTimes(1);
    expect(notifications.notify).toHaveBeenCalledTimes(1);
  });

  it('create succeeds instead of conflicting', async () => {
    const { service, repository } = met();
    await service.create('me', { type: 'streak', target: 3, shared: false }, later);
    expect(repository.markReached).toHaveBeenCalledTimes(1);
    expect(repository.insert).toHaveBeenCalledTimes(1);
  });

  it('does not notify when another request already marked it', async () => {
    const { service, repository, notifications } = met();
    repository.markReached.mockResolvedValueOnce(false);
    await service.getMine('me', later);
    expect(notifications.notify).not.toHaveBeenCalled();
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
  const reached = row({
    id: 'g9',
    user_id: 'a',
    status: 'reached',
    reached_at: '2026-11-03T08:00:00Z',
  });

  it('covers only current friends shared goals reached in the last 48h', async () => {
    const { service, repository } = setup({ friends: ['a'], friendsOf: { a: ['me', 'x'] } });
    repository.reachedSharedSince.mockResolvedValueOnce([reached]);
    repository.cheersFor.mockResolvedValueOnce([{ goal_id: 'g9', user_id: 'me' }]);
    const list = await service.celebrations('me', NOW);
    expect(repository.reachedSharedSince).toHaveBeenCalledWith(['a'], '2026-11-02T10:00:00.000Z');
    expect(list).toEqual([
      {
        goalId: 'g9',
        actor: { userId: 'a', username: 'n_a', displayName: 'a' },
        title: 'Log 2 days in a row',
        reachedAt: '2026-11-03T08:00:00Z',
        cheers: 1,
        cheeredByMe: true,
      },
    ]);
  });

  it('drops a cheer once the cheerer is no longer friends with the achiever', async () => {
    // y is still the viewer's friend, but the friendship with achiever a ended.
    const { service, repository } = setup({ friends: ['a', 'y'], friendsOf: { a: [] } });
    repository.reachedSharedSince.mockResolvedValueOnce([reached]);
    repository.cheersFor.mockResolvedValueOnce([{ goal_id: 'g9', user_id: 'y' }]);
    expect((await service.celebrations('me', NOW))[0]).toMatchObject({ cheers: 0 });
  });

  it('counts a cheer from the achievers friend even if not the viewers friend', async () => {
    const { service, repository, friends } = setup({ friends: ['a'], friendsOf: { a: ['x'] } });
    repository.reachedSharedSince.mockResolvedValueOnce([reached, { ...reached, id: 'g10' }]);
    repository.cheersFor.mockResolvedValueOnce([{ goal_id: 'g9', user_id: 'x' }]);
    const list = await service.celebrations('me', NOW);
    expect(list[0]).toMatchObject({ cheers: 1, cheeredByMe: false });
    // one friendIds call per distinct goal owner, plus the viewer's own
    expect(friends.friendIds).toHaveBeenCalledTimes(2);
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
