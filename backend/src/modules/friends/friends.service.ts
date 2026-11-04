import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors';
import { pktDay } from '../../shared/time/pkt';
import type { NotificationsService } from '../notifications';
import type { PersonCard, ProfilesService } from '../profiles';
import type { StreaksService } from '../streaks';
import type { FriendsRepository } from './friends.repository';
import type { FriendRow, FriendshipRow, FriendsOverview } from './friends.types';

interface FriendsDeps {
  repository: FriendsRepository;
  streaks: StreaksService;
  profiles: ProfilesService;
  notifications: NotificationsService;
}

const FRIEND_CAP = 50;
const SEARCH_LIMIT = 10;
const SEARCH_FETCH = 30; // over-fetch so filtering out self and existing friends still leaves 10

const pair = (a: string, b: string): [string, string] => (a < b ? [a, b] : [b, a]);
const otherOf = (r: FriendshipRow, me: string) => (r.user_low === me ? r.user_high : r.user_low);

export function createFriendsService({
  repository,
  streaks,
  profiles,
  notifications,
}: FriendsDeps) {
  async function assertUnderCap(...ids: string[]): Promise<void> {
    const counts = await Promise.all(ids.map((id) => repository.countActive(id)));
    if (counts.some((n) => n >= FRIEND_CAP)) throw new ValidationError('Friend limit reached');
  }

  async function friendIds(userId: string): Promise<string[]> {
    return (await repository.listFor(userId))
      .filter((r) => r.status === 'active')
      .map((r) => otherOf(r, userId));
  }

  // Sends or auto-accepts. A lost race (23505 or a changed row) re-reads and retries once.
  async function open(
    userId: string,
    targetId: string,
    retry = true,
  ): Promise<'requested' | 'accepted'> {
    const [low, high] = pair(userId, targetId);
    const row = await repository.find(low, high);
    const again = () => {
      if (retry) return open(userId, targetId, false);
      throw new ConflictError('Please try again');
    };
    if (!row) {
      try {
        await repository.insert(low, high, userId);
        return 'requested';
      } catch (e) {
        if ((e as { code?: string }).code === '23505') return again();
        throw e;
      }
    }
    if (row.status === 'active') throw new ValidationError('Already friends');
    if (row.status === 'pending') {
      if (row.requested_by === userId) throw new ValidationError('Request already sent');
      const ok = await repository.transition(
        low,
        high,
        { from: ['pending'], requestedBy: targetId },
        { status: 'active' },
      );
      return ok ? 'accepted' : again();
    }
    const ok = await repository.transition(
      low,
      high,
      { from: ['declined', 'removed'] },
      { status: 'pending', requestedBy: userId },
    );
    return ok ? 'requested' : again();
  }

  return {
    friendIds,

    async areFriends(a: string, b: string): Promise<boolean> {
      const [low, high] = pair(a, b);
      return (await repository.find(low, high))?.status === 'active';
    },

    async overview(userId: string, now = new Date()): Promise<FriendsOverview> {
      const rows = await repository.listFor(userId);
      const ids = rows.filter((r) => r.status === 'active').map((r) => otherOf(r, userId));
      const pending = rows.filter((r) => r.status === 'pending');
      const [cards, status, nudged] = await Promise.all([
        profiles.getCards(rows.map((r) => otherOf(r, userId))),
        streaks.getStreaks(ids, now),
        notifications.nudgesSentOn(userId, pktDay(now)),
      ]);
      const card = (id: string) => cards.find((c) => c.userId === id);
      const cardsOf = (list: FriendshipRow[]): PersonCard[] =>
        list.flatMap((r) => card(otherOf(r, userId)) ?? []);
      // Built key by key so nothing else ever leaks into a friend row.
      const friends = ids.flatMap((id): FriendRow[] => {
        const c = card(id);
        const s = status[id];
        if (!c || !s) return [];
        return [
          {
            userId: id,
            username: c.username,
            displayName: c.displayName,
            streak: s.streak,
            loggedToday: s.loggedToday,
            nudgedToday: nudged.includes(id),
          },
        ];
      });
      return {
        friends,
        loggedCount: friends.filter((f) => f.loggedToday).length,
        incoming: cardsOf(pending.filter((r) => r.requested_by !== userId)),
        outgoing: cardsOf(pending.filter((r) => r.requested_by === userId)),
      };
    },

    async search(userId: string, q: string): Promise<PersonCard[]> {
      if (q.length < 3) throw new ValidationError('Type at least 3 characters');
      const [found, rows] = await Promise.all([
        profiles.searchUsernames(q, SEARCH_FETCH),
        repository.listFor(userId),
      ]);
      const taken = new Set([userId, ...rows.map((r) => otherOf(r, userId))]);
      return found.filter((p) => !taken.has(p.userId)).slice(0, SEARCH_LIMIT);
    },

    async request(userId: string, username: string): Promise<void> {
      const target = (await profiles.searchUsernames(username, SEARCH_FETCH)).find(
        (p) => p.username === username.toLowerCase(),
      );
      if (!target) throw new NotFoundError('No user with that username');
      if (target.userId === userId) throw new ValidationError('You cannot add yourself');
      await assertUnderCap(userId, target.userId);
      const outcome = await open(userId, target.userId);
      await notifications.notify({
        userId: target.userId,
        kind: outcome === 'accepted' ? 'request_accepted' : 'friend_request',
        actorId: userId,
      });
    },

    async respond(
      userId: string,
      fromUserId: string,
      decision: 'accept' | 'decline',
    ): Promise<void> {
      if (fromUserId === userId) throw new NotFoundError('No such request');
      if (decision === 'accept') await assertUnderCap(userId, fromUserId);
      const [low, high] = pair(userId, fromUserId);
      // requestedBy = the sender, so only the recipient of a pending request can answer it.
      const ok = await repository.transition(
        low,
        high,
        { from: ['pending'], requestedBy: fromUserId },
        { status: decision === 'accept' ? 'active' : 'declined' },
      );
      if (!ok) throw new NotFoundError('No such request');
      if (decision === 'accept')
        await notifications.notify({
          userId: fromUserId,
          kind: 'request_accepted',
          actorId: userId,
        });
    },

    async remove(userId: string, otherUserId: string): Promise<void> {
      const [low, high] = pair(userId, otherUserId);
      if (!(await repository.transition(low, high, { from: ['active'] }, { status: 'removed' })))
        throw new NotFoundError('Not friends');
    },

    async nudge(userId: string, friendId: string, now = new Date()): Promise<void> {
      const [low, high] = pair(userId, friendId);
      if ((await repository.find(low, high))?.status !== 'active')
        throw new NotFoundError('Not friends');
      if ((await streaks.getStreaks([friendId], now))[friendId]?.loggedToday)
        throw new ValidationError('Already logged today');
      try {
        await notifications.notify({
          userId: friendId,
          kind: 'nudge',
          actorId: userId,
          day: pktDay(now),
        });
      } catch (e) {
        if (e instanceof ConflictError) throw new ValidationError('Already nudged today');
        throw e;
      }
    },
  };
}
export type FriendsService = ReturnType<typeof createFriendsService>;
