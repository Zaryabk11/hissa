import { describe, expect, it, vi } from 'vitest';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors';
import type { PersonCard } from '../../profiles';
import { createFriendsService } from '../friends.service';
import type { FriendshipRow, FriendshipStatus } from '../friends.types';

const [me, bob, cat] = ['u1', 'u2', 'u3'];
const NOW = new Date('2026-11-04T10:00:00Z'); // PKT day 2026-11-04
const people: PersonCard[] = [me, bob, cat, 'u4'].map((id) => ({
  userId: id,
  username: `name_${id}`,
  displayName: `Name ${id}`,
}));
const row = (
  a: string,
  b: string,
  requestedBy: string,
  status: FriendshipStatus,
): FriendshipRow => ({
  user_low: a < b ? a : b,
  user_high: a < b ? b : a,
  requested_by: requestedBy,
  status,
});

// In-memory stand-in for the repository, so tests check outcomes (rows) not call shapes.
function setup(
  initial: FriendshipRow[] = [],
  streaks: Record<string, { streak: number; loggedToday: boolean }> = {},
) {
  const rows = [...initial];
  const repository = {
    find: vi.fn(
      async (low: string, high: string) =>
        rows.find((r) => r.user_low === low && r.user_high === high) ?? null,
    ),
    insert: vi.fn(async (low: string, high: string, by: string) => {
      if (rows.some((r) => r.user_low === low && r.user_high === high)) throw { code: '23505' };
      rows.push({ user_low: low, user_high: high, requested_by: by, status: 'pending' });
    }),
    transition: vi.fn(
      async (
        low: string,
        high: string,
        where: { from: FriendshipStatus[]; requestedBy?: string },
        set: { status: FriendshipStatus; requestedBy?: string },
      ) => {
        const r = rows.find(
          (x) =>
            x.user_low === low &&
            x.user_high === high &&
            where.from.includes(x.status) &&
            (where.requestedBy === undefined || x.requested_by === where.requestedBy),
        );
        if (!r) return false;
        r.status = set.status;
        if (set.requestedBy) r.requested_by = set.requestedBy;
        return true;
      },
    ),
    listFor: vi.fn(async (id: string) =>
      rows.filter(
        (r) =>
          (r.user_low === id || r.user_high === id) && ['pending', 'active'].includes(r.status),
      ),
    ),
    countActive: vi.fn(
      async (id: string) =>
        rows.filter((r) => (r.user_low === id || r.user_high === id) && r.status === 'active')
          .length,
    ),
  };
  const profiles = {
    searchUsernames: vi.fn(async (prefix: string, limit: number) =>
      people.filter((p) => (p.username ?? '').startsWith(prefix)).slice(0, limit),
    ),
    getCards: vi.fn(async (ids: string[]) => people.filter((p) => ids.includes(p.userId))),
  };
  const streaksSvc = {
    getStreaks: vi.fn(async (ids: string[]) =>
      Object.fromEntries(ids.map((id) => [id, streaks[id] ?? { streak: 0, loggedToday: false }])),
    ),
  };
  const notifications = {
    notify: vi.fn(async (_n: unknown) => {}),
    nudgesSentOn: vi.fn(async (_actor: string, _day: string): Promise<string[]> => []),
  };
  const service = createFriendsService({
    repository,
    profiles: profiles as never,
    streaks: streaksSvc as never,
    notifications: notifications as never,
  });
  return { rows, repository, profiles, streaks: streaksSvc, notifications, service };
}

const statusOf = (rows: FriendshipRow[], a: string, b: string) =>
  rows.filter((r) => r.user_low === (a < b ? a : b) && r.user_high === (a < b ? b : a));

describe('friends service: request', () => {
  it('rejects a request to yourself with 400', async () => {
    const { service, rows } = setup();
    await expect(service.request(me, `name_${me}`)).rejects.toBeInstanceOf(ValidationError);
    expect(rows).toHaveLength(0);
  });

  it('404s for an unknown username', async () => {
    const { service } = setup();
    await expect(service.request(me, 'nobody')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('creates a pending request and notifies the target', async () => {
    const { service, rows, notifications } = setup();
    await service.request(me, `name_${bob}`);
    expect(rows).toEqual([row(me, bob, me, 'pending')]);
    expect(notifications.notify).toHaveBeenCalledWith({
      userId: bob,
      kind: 'friend_request',
      actorId: me,
    });
  });

  it('auto-accepts when the target already asked the caller, and notifies the target', async () => {
    const { service, rows, notifications } = setup([row(me, bob, bob, 'pending')]);
    await service.request(me, `name_${bob}`);
    expect(rows).toEqual([row(me, bob, bob, 'active')]);
    expect(notifications.notify).toHaveBeenCalledWith({
      userId: bob,
      kind: 'request_accepted',
      actorId: me,
    });
    expect(notifications.notify).toHaveBeenCalledTimes(1);
  });

  it('rejects a duplicate pending request from the caller with 400', async () => {
    const { service, notifications } = setup([row(me, bob, me, 'pending')]);
    await expect(service.request(me, `name_${bob}`)).rejects.toBeInstanceOf(ValidationError);
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('rejects a request to an existing friend with 400', async () => {
    const { service } = setup([row(me, bob, bob, 'active')]);
    await expect(service.request(me, `name_${bob}`)).rejects.toBeInstanceOf(ValidationError);
  });

  it.each(['declined', 'removed'] as const)('allows a new request after %s', async (status) => {
    const { service, rows } = setup([row(me, bob, bob, status)]);
    await service.request(me, `name_${bob}`);
    expect(rows).toEqual([row(me, bob, me, 'pending')]);
  });

  it('rejects when the caller or the target is at 50 friends', async () => {
    const full = (id: string) =>
      Array.from({ length: 50 }, (_, i) => row(id, `z${String(i).padStart(2, '0')}`, id, 'active'));
    await expect(setup(full(me)).service.request(me, `name_${bob}`)).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(setup(full(bob)).service.request(me, `name_${bob}`)).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('simultaneous mutual requests leave exactly one active row', async () => {
    const { service, rows, repository } = setup();
    // The other side's insert wins the race: it lands just before ours, which gets a 23505.
    repository.insert.mockImplementationOnce(async (low: string, high: string) => {
      rows.push({ user_low: low, user_high: high, requested_by: bob, status: 'pending' });
      throw { code: '23505' };
    });
    await service.request(me, `name_${bob}`);
    expect(statusOf(rows, me, bob)).toEqual([row(me, bob, bob, 'active')]);
  });

  it('turns a failed transition on retry into a 409, never a 500', async () => {
    const { service, repository } = setup([row(me, bob, bob, 'declined')]);
    repository.transition.mockResolvedValue(false);
    await expect(service.request(me, `name_${bob}`)).rejects.toBeInstanceOf(ConflictError);
  });
});

describe('friends service: respond', () => {
  it('accept activates the request and notifies the requester', async () => {
    const { service, rows, notifications } = setup([row(me, bob, bob, 'pending')]);
    await service.respond(me, bob, 'accept');
    expect(rows[0]?.status).toBe('active');
    expect(notifications.notify).toHaveBeenCalledWith({
      userId: bob,
      kind: 'request_accepted',
      actorId: me,
    });
  });

  it('decline marks it declined without notifying', async () => {
    const { service, rows, notifications } = setup([row(me, bob, bob, 'pending')]);
    await service.respond(me, bob, 'decline');
    expect(rows[0]?.status).toBe('declined');
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('the requester cannot accept their own request (404)', async () => {
    const { service, rows } = setup([row(me, bob, me, 'pending')]);
    await expect(service.respond(me, bob, 'accept')).rejects.toBeInstanceOf(NotFoundError);
    expect(rows[0]?.status).toBe('pending');
  });

  it('404s when there is no pending request, and for yourself', async () => {
    const { service } = setup([row(me, bob, bob, 'active')]);
    await expect(service.respond(me, bob, 'accept')).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.respond(me, me, 'accept')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('accept is rejected at the 50-friend cap', async () => {
    const full = Array.from({ length: 50 }, (_, i) =>
      row(me, `z${String(i).padStart(2, '0')}`, me, 'active'),
    );
    const { service, rows } = setup([...full, row(me, bob, bob, 'pending')]);
    await expect(service.respond(me, bob, 'accept')).rejects.toBeInstanceOf(ValidationError);
    expect(rows.at(-1)?.status).toBe('pending');
  });
});

describe('friends service: remove', () => {
  it('either party can remove, and friendIds then excludes them', async () => {
    const { service } = setup([row(me, bob, me, 'active'), row(me, cat, cat, 'active')]);
    expect((await service.friendIds(me)).sort()).toEqual([bob, cat]);
    await service.remove(bob, me);
    expect(await service.friendIds(me)).toEqual([cat]);
    expect(await service.friendIds(bob)).toEqual([]);
    expect(await service.areFriends(me, bob)).toBe(false);
    await service.remove(me, cat);
    expect(await service.friendIds(me)).toEqual([]);
  });

  it('404s when they are not friends', async () => {
    const { service } = setup([row(me, bob, me, 'pending')]);
    await expect(service.remove(me, bob)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('friends service: nudge', () => {
  it('404s for a non-friend and sends nothing', async () => {
    const { service, notifications } = setup([row(me, bob, me, 'pending')]);
    await expect(service.nudge(me, bob, NOW)).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.nudge(me, cat, NOW)).rejects.toBeInstanceOf(NotFoundError);
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('400s when the friend already logged today', async () => {
    const { service, notifications } = setup([row(me, bob, me, 'active')], {
      [bob]: { streak: 3, loggedToday: true },
    });
    await expect(service.nudge(me, bob, NOW)).rejects.toBeInstanceOf(ValidationError);
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('400s on a second nudge the same day (notify conflict)', async () => {
    const { service, notifications } = setup([row(me, bob, me, 'active')]);
    notifications.notify.mockRejectedValueOnce(new ConflictError('Already nudged today'));
    await expect(service.nudge(me, bob, NOW)).rejects.toBeInstanceOf(ValidationError);
  });

  it('lets other errors through', async () => {
    const { service, notifications } = setup([row(me, bob, me, 'active')]);
    notifications.notify.mockRejectedValueOnce(new Error('db down'));
    await expect(service.nudge(me, bob, NOW)).rejects.toThrow('db down');
  });

  it('notifies the friend with the PKT day', async () => {
    const { service, notifications } = setup([row(me, bob, me, 'active')]);
    await service.nudge(me, bob, new Date('2026-11-04T20:00:00Z')); // 01:00 PKT on the 5th
    expect(notifications.notify).toHaveBeenCalledWith({
      userId: bob,
      kind: 'nudge',
      actorId: me,
      day: '2026-11-05',
    });
  });
});

describe('friends service: cheerStreak', () => {
  const active = [row(me, bob, me, 'active')];
  const hot = { [bob]: { streak: 3, loggedToday: true } };

  it('notifies a logged friend on a streak of 3 with the PKT day', async () => {
    const { service, notifications } = setup(active, hot);
    await service.cheerStreak(me, bob, new Date('2026-11-04T20:00:00Z')); // 01:00 PKT on the 5th
    expect(notifications.notify).toHaveBeenCalledTimes(1);
    expect(notifications.notify).toHaveBeenCalledWith({
      userId: bob,
      kind: 'cheer_streak',
      actorId: me,
      day: '2026-11-05',
    });
  });

  it('400s on a streak under 3', async () => {
    const { service, notifications } = setup(active, { [bob]: { streak: 2, loggedToday: true } });
    await expect(service.cheerStreak(me, bob, NOW)).rejects.toBeInstanceOf(ValidationError);
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('400s when the friend has not logged today', async () => {
    const { service, notifications } = setup(active, { [bob]: { streak: 5, loggedToday: false } });
    await expect(service.cheerStreak(me, bob, NOW)).rejects.toBeInstanceOf(ValidationError);
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('404s for a non-friend, yourself and a removed friend, sending nothing', async () => {
    const { service, notifications } = setup(
      [row(me, bob, me, 'pending'), row(me, cat, me, 'removed')],
      { [bob]: { streak: 9, loggedToday: true }, [cat]: { streak: 9, loggedToday: true } },
    );
    await expect(service.cheerStreak(me, bob, NOW)).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.cheerStreak(me, cat, NOW)).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.cheerStreak(me, 'u4', NOW)).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.cheerStreak(me, me, NOW)).rejects.toBeInstanceOf(NotFoundError);
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('a repeat the same day is a 409, not remapped', async () => {
    const { service, notifications } = setup(active, hot);
    notifications.notify.mockRejectedValueOnce(new ConflictError('Already cheered today'));
    const err = await service.cheerStreak(me, bob, NOW).catch((e) => e);
    expect(err).toBeInstanceOf(ConflictError);
    expect(err.message).toBe('Already cheered today');
  });

  it('lets other errors through', async () => {
    const { service, notifications } = setup(active, hot);
    notifications.notify.mockRejectedValueOnce(new Error('db down'));
    await expect(service.cheerStreak(me, bob, NOW)).rejects.toThrow('db down');
  });

  it('a nudge and a cheer the same day both go through, and the next day is allowed', async () => {
    const { service, notifications, streaks } = setup(active, hot);
    streaks.getStreaks.mockResolvedValueOnce({ [bob]: { streak: 3, loggedToday: false } });
    await service.nudge(me, bob, NOW);
    await service.cheerStreak(me, bob, NOW);
    await service.cheerStreak(me, bob, new Date('2026-11-05T10:00:00Z'));
    expect(notifications.notify.mock.calls.map((c) => c[0])).toEqual([
      { userId: bob, kind: 'nudge', actorId: me, day: '2026-11-04' },
      { userId: bob, kind: 'cheer_streak', actorId: me, day: '2026-11-04' },
      { userId: bob, kind: 'cheer_streak', actorId: me, day: '2026-11-05' },
    ]);
  });
});

describe('friends service: overview', () => {
  const data = [
    row(me, bob, me, 'active'),
    row(me, cat, cat, 'active'),
    row(me, 'u4', 'u4', 'pending'),
  ];

  it('counts logged friends, flags nudged ones and returns exactly the seven whitelisted keys', async () => {
    const { service, notifications, streaks, profiles } = setup(data, {
      [bob]: { streak: 4, loggedToday: true },
      [cat]: { streak: 0, loggedToday: false },
    });
    notifications.nudgesSentOn.mockResolvedValue([cat]);
    const o = await service.overview(me, NOW);
    expect(o.loggedCount).toBe(1);
    expect(o.friends.find((f) => f.userId === cat)?.nudgedToday).toBe(true);
    expect(o.friends.find((f) => f.userId === bob)?.nudgedToday).toBe(false);
    for (const f of o.friends)
      expect(Object.keys(f).sort()).toEqual([
        'displayName',
        'loggedToday',
        'nudgedToday',
        'streak',
        'userId',
        'username',
      ]);
    expect(notifications.nudgesSentOn).toHaveBeenCalledWith(me, '2026-11-04');
    // One batch each, not per friend.
    expect(streaks.getStreaks).toHaveBeenCalledTimes(1);
    expect(profiles.getCards).toHaveBeenCalledTimes(1);
  });

  it('splits pending requests into incoming and outgoing cards', async () => {
    const { service } = setup([row(me, 'u4', 'u4', 'pending'), row(me, bob, me, 'pending')]);
    const o = await service.overview(me, NOW);
    expect(o.incoming.map((p) => p.userId)).toEqual(['u4']);
    expect(o.outgoing.map((p) => p.userId)).toEqual([bob]);
    expect(Object.keys(o.incoming[0] ?? {}).sort()).toEqual(['displayName', 'userId', 'username']);
  });
});

describe('friends service: search', () => {
  it('400s below 3 characters without querying', async () => {
    const { service, profiles } = setup();
    await expect(service.search(me, 'na')).rejects.toBeInstanceOf(ValidationError);
    expect(profiles.searchUsernames).not.toHaveBeenCalled();
  });

  it('excludes self and anyone with a pending or active friendship', async () => {
    const { service } = setup([
      row(me, bob, me, 'pending'),
      row(me, cat, cat, 'active'),
      row(me, 'u4', 'u4', 'declined'),
    ]);
    expect((await service.search(me, 'name_')).map((p) => p.userId)).toEqual(['u4']);
  });

  it('caps results at 10 after filtering', async () => {
    const { service, profiles } = setup();
    profiles.searchUsernames.mockImplementation(async () =>
      Array.from({ length: 30 }, (_, i) => ({
        userId: `x${i}`,
        username: `many_${i}`,
        displayName: null,
      })),
    );
    expect(await service.search(me, 'many')).toHaveLength(10);
    expect(profiles.searchUsernames).toHaveBeenCalledWith('many', 30);
  });
});
