import { randomInt } from 'node:crypto';
import { ValidationError } from '../../shared/errors';
import { pktDay } from '../../shared/time/pkt';
import type { StreaksRepository } from './streaks.repository';
import { inviteCodeSchema } from './streaks.schemas';
import type { InvitationPreview, InviteDecision } from './streaks.types';

interface StreaksDeps {
  repository: StreaksRepository;
}
function previousDay(day: string): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
}
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
function validateCode(code: string): void {
  if (!inviteCodeSchema.safeParse(code).success) throw new ValidationError('Invalid invite code');
}
async function databaseResult<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if ((error as { code?: string }).code === 'P0001') {
      throw new ValidationError('Invitation unavailable or user already has a buddy invitation');
    }
    throw error;
  }
}
export type BuddyStatus = {
  pairStatus: 'none' | 'pending' | 'active';
  pendingInviteCode: string | null;
  streak: number;
  ownLoggedToday: boolean;
  buddyLoggedToday: boolean | null;
  unreadNudge: boolean;
};
export function createStreaksService({ repository }: StreaksDeps) {
  return {
    async markMealSaved(userId: string, eatenAt: string): Promise<void> {
      await repository.markDay(userId, pktDay(new Date(eatenAt)));
    },
    async getStatus(userId: string, now = new Date()): Promise<BuddyStatus> {
      const today = pktDay(now);
      const state = await repository.status(userId, today);
      const own = new Set(state.ownDays);
      const buddy = new Set(state.buddyDays);
      let streak = 0;
      if (state.pairStatus === 'active' && state.acceptedAt) {
        const accepted = pktDay(new Date(state.acceptedAt));
        let day = today;
        if (!(own.has(day) && buddy.has(day))) day = previousDay(day);
        while (day >= accepted && own.has(day) && buddy.has(day)) {
          streak++;
          day = previousDay(day);
        }
      }
      return {
        pairStatus: state.pairStatus,
        pendingInviteCode: state.pairStatus === 'pending' ? state.pendingInviteCode : null,
        streak,
        ownLoggedToday: own.has(today),
        buddyLoggedToday: state.pairStatus === 'active' ? buddy.has(today) : null,
        unreadNudge: state.pairStatus === 'active' && state.unreadNudge,
      };
    },
    async nudge(userId: string, now = new Date()): Promise<void> {
      const day = pktDay(now);
      const state = await repository.status(userId, day);
      if (state.pairStatus !== 'active' || state.buddyDays.includes(day) || state.nudgedToday)
        throw new ValidationError('Nudge unavailable');
      try {
        await repository.nudge(userId, day);
      } catch (error) {
        if (['P0001', '23505'].includes((error as { code: string }).code))
          throw new ValidationError('Nudge unavailable');
        throw error;
      }
    },
    async ackNudge(userId: string): Promise<void> {
      await repository.ackNudge(userId);
    },
    async createInvite(userId: string): Promise<{ code: string; linkPath: string }> {
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
        try {
          await databaseResult(() => repository.createInvite(userId, code));
          return { code, linkPath: `/invite/${code}` };
        } catch (error) {
          if ((error as { code?: string }).code !== '23505' || attempt === 4) throw error;
        }
      }
      throw new Error('Invite generation exhausted');
    },
    async previewInvite(userId: string, code: string): Promise<InvitationPreview> {
      validateCode(code);
      const preview = await databaseResult(() => repository.previewInvite(userId, code));
      return { code: preview.code, status: preview.status };
    },
    async respondInvite(userId: string, code: string, decision: InviteDecision): Promise<void> {
      validateCode(code);
      await databaseResult(() => repository.respondInvite(userId, code, decision));
    },
    async endPair(userId: string): Promise<void> {
      await databaseResult(() => repository.endPair(userId));
    },
  };
}
export type StreaksService = ReturnType<typeof createStreaksService>;
