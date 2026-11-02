import type { Db } from '../../shared/db';
import type { InvitationPreview, InviteDecision } from './streaks.types';

export type BuddySnapshot = {
  pairStatus: 'none' | 'pending' | 'active';
  pendingInviteCode: string | null;
  acceptedAt: string | null;
  ownDays: string[];
  buddyDays: string[];
  unreadNudge: boolean;
  nudgedToday: boolean;
};
// The RPC scopes every operation to the authenticated actor. Code lookup is a
// capability lookup, returning only the approved minimal preview.
export function createStreaksRepository(db: Db) {
  async function operation(userId: string, action: string, code: string | null = null) {
    const { data, error } = await db.rpc('buddy_invite_operation', {
      actor_id: userId,
      operation: action,
      code,
    });
    if (error) throw error;
    return data;
  }
  async function buddyOperation(userId: string, action: string, day: string | null = null) {
    const { data, error } = await db.rpc('buddy_status_operation', {
      actor_id: userId,
      operation: action,
      target_day: day,
    });
    if (error) throw error;
    return data;
  }
  return {
    async markDay(userId: string, day: string): Promise<void> {
      const { error } = await db
        .from('streak_days')
        .upsert({ user_id: userId, day }, { onConflict: 'user_id,day' });
      if (error) throw error;
    },
    async status(userId: string, day: string): Promise<BuddySnapshot> {
      return (await buddyOperation(userId, 'status', day)) as BuddySnapshot;
    },
    async nudge(userId: string, day: string): Promise<void> {
      await buddyOperation(userId, 'nudge', day);
    },
    async ackNudge(userId: string): Promise<void> {
      await buddyOperation(userId, 'ack');
    },
    async createInvite(userId: string, code: string): Promise<void> {
      await operation(userId, 'create', code);
    },
    async previewInvite(userId: string, code: string): Promise<InvitationPreview> {
      return (await operation(userId, 'preview', code)) as InvitationPreview;
    },
    async respondInvite(userId: string, code: string, decision: InviteDecision): Promise<void> {
      await operation(userId, decision, code);
    },
    async endPair(userId: string): Promise<void> {
      await operation(userId, 'end');
    },
  };
}
export type StreaksRepository = ReturnType<typeof createStreaksRepository>;
