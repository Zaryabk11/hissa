import { describe, expect, it, vi } from 'vitest';
import type { Db } from '../../../shared/db';
import { ConflictError } from '../../../shared/errors';
import type { ProfilesService } from '../../profiles';
import { formatGoalTitle } from '..';
import { createNotificationsRepository } from '../notifications.repository';
import { createNotificationsService } from '../notifications.service';

const ann = { userId: 'a1', username: 'ann', displayName: 'Ann' };

function setup() {
  const repository = {
    insert: vi.fn(async () => {}),
    list: vi.fn(async () => [] as unknown[]),
    unreadCount: vi.fn(async () => 0),
    goalsByIds: vi.fn(async () => [] as unknown[]),
    markAllRead: vi.fn(async () => {}),
    nudgeRecipients: vi.fn(async () => ['u2']),
  };
  const getCards = vi.fn(async () => [ann]);
  const service = createNotificationsService({
    repository: repository as never,
    profiles: { getCards } as unknown as ProfilesService,
  });
  return { service, repository, getCards };
}

describe('notifications service', () => {
  it('notify maps a duplicate nudge (23505) to ConflictError', async () => {
    const { service, repository } = setup();
    repository.insert.mockRejectedValueOnce({ code: '23505' });
    await expect(
      service.notify({ userId: 'u2', kind: 'nudge', actorId: 'a1', day: '2026-11-04' }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('notify passes other errors through', async () => {
    const { service, repository } = setup();
    repository.insert.mockRejectedValueOnce(new Error('boom'));
    await expect(service.notify({ userId: 'u2', kind: 'cheer', actorId: 'a1' })).rejects.toThrow(
      'boom',
    );
  });

  it('nudgesSentOn returns recipient ids', async () => {
    const { service, repository } = setup();
    expect(await service.nudgesSentOn('a1', '2026-11-04')).toEqual(['u2']);
    expect(repository.nudgeRecipients).toHaveBeenCalledWith('a1', '2026-11-04');
  });

  it('list returns the callers items with exact keys, actor cards and goal titles', async () => {
    const { service, repository, getCards } = setup();
    repository.list.mockResolvedValueOnce([
      {
        id: 'n1',
        kind: 'goal_reached',
        actor_id: 'a1',
        goal_id: 'g1',
        created_at: 't1',
        read_at: null,
      },
      { id: 'n2', kind: 'nudge', actor_id: 'a1', goal_id: null, created_at: 't0', read_at: 't2' },
    ]);
    repository.goalsByIds.mockResolvedValueOnce([
      { id: 'g1', type: 'window', target: 5, window_days: 7 },
    ]);
    repository.unreadCount.mockResolvedValueOnce(1);
    const out = await service.list('u1');
    expect(repository.list).toHaveBeenCalledWith('u1');
    expect(repository.unreadCount).toHaveBeenCalledWith('u1');
    expect(getCards).toHaveBeenCalledWith(['a1']);
    expect(out.unread).toBe(1);
    expect(Object.keys(out.items[0] ?? {})).toEqual([
      'id',
      'kind',
      'actor',
      'goalTitle',
      'createdAt',
      'read',
    ]);
    expect(out.items[0]).toMatchObject({ actor: ann, goalTitle: 'Log 5 days in 7', read: false });
    expect(out.items[1]).toMatchObject({ goalTitle: null, read: true });
  });

  it('markAllRead updates the callers rows', async () => {
    const { service, repository } = setup();
    await service.markAllRead('u1');
    expect(repository.markAllRead).toHaveBeenCalledWith('u1');
  });
});

describe('formatGoalTitle', () => {
  it('words streak and window goals', () => {
    expect(formatGoalTitle('streak', 7, null)).toBe('Log 7 days in a row');
    expect(formatGoalTitle('window', 5, 7)).toBe('Log 5 days in 7');
  });
});

describe('notifications repository', () => {
  it('markAllRead filters on the user_id and unread rows', async () => {
    const eq = vi.fn(() => ({ is }));
    const is = vi.fn(async () => ({ error: null }));
    const update = vi.fn(() => ({ eq }));
    const db = { from: vi.fn(() => ({ update })) } as unknown as Db;
    await createNotificationsRepository(db).markAllRead('u1');
    expect(eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(is).toHaveBeenCalledWith('read_at', null);
  });
});
