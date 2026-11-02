import type { Db } from '../../shared/db';
import type { InvitationPreview, InviteDecision } from './streaks.types';

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
  return {
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
