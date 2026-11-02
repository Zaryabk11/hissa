import { randomInt } from 'node:crypto';
import { NotImplementedError, ValidationError } from '../../shared/errors';
import type { StreaksRepository } from './streaks.repository';
import { inviteCodeSchema } from './streaks.schemas';
import type { InvitationPreview, InviteDecision } from './streaks.types';

interface StreaksDeps {
  repository: StreaksRepository;
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
export function createStreaksService({ repository }: StreaksDeps) {
  return {
    async getStreak(): Promise<never> {
      throw new NotImplementedError('streaks.getStreak');
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
