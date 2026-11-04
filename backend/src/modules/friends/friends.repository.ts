import type { Db } from '../../shared/db';
import type { FriendshipRow, FriendshipStatus } from './friends.types';

const COLUMNS = 'user_low, user_high, requested_by, status';

// Data access for friendships. A pair is always keyed [low, high] with low < high.
export function createFriendsRepository(db: Db) {
  return {
    async find(low: string, high: string): Promise<FriendshipRow | null> {
      const { data, error } = await db
        .from('friendships')
        .select(COLUMNS)
        .eq('user_low', low)
        .eq('user_high', high)
        .maybeSingle();
      if (error) throw error;
      return data as FriendshipRow | null;
    },

    // Throws with code 23505 when the pair already has a row.
    async insert(low: string, high: string, requestedBy: string): Promise<void> {
      const { error } = await db
        .from('friendships')
        .insert({ user_low: low, user_high: high, requested_by: requestedBy, status: 'pending' });
      if (error) throw error;
    },

    // Conditional update: true only if a row matched `where` and was changed.
    async transition(
      low: string,
      high: string,
      where: { from: FriendshipStatus[]; requestedBy?: string },
      set: { status: FriendshipStatus; requestedBy?: string },
    ): Promise<boolean> {
      const now = new Date().toISOString();
      let q = db
        .from('friendships')
        .update({
          status: set.status,
          updated_at: now,
          ...(set.requestedBy ? { requested_by: set.requestedBy } : {}),
          ...(set.status === 'active' ? { accepted_at: now } : {}),
        })
        .eq('user_low', low)
        .eq('user_high', high)
        .in('status', where.from);
      if (where.requestedBy) q = q.eq('requested_by', where.requestedBy);
      const { data, error } = await q.select('user_low');
      if (error) throw error;
      return data.length > 0;
    },

    // Pending and active rows the user is a party to.
    async listFor(userId: string): Promise<FriendshipRow[]> {
      const { data, error } = await db
        .from('friendships')
        .select(COLUMNS)
        .or(`user_low.eq.${userId},user_high.eq.${userId}`)
        .in('status', ['pending', 'active']);
      if (error) throw error;
      return data as FriendshipRow[];
    },

    async countActive(userId: string): Promise<number> {
      const { count, error } = await db
        .from('friendships')
        .select('user_low', { count: 'exact', head: true })
        .or(`user_low.eq.${userId},user_high.eq.${userId}`)
        .eq('status', 'active');
      if (error) throw error;
      return count ?? 0;
    },
  };
}
export type FriendsRepository = ReturnType<typeof createFriendsRepository>;
