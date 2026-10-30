import { NotImplementedError } from '../../shared/errors';
import type { StreaksRepository } from './streaks.repository';

interface StreaksDeps {
  repository: StreaksRepository;
}

// Business rules for streaks.
export function createStreaksService(_deps: StreaksDeps) {
  return {
    async getStreak(): Promise<never> {
      throw new NotImplementedError('streaks.getStreak');
    },
  };
}

export type StreaksService = ReturnType<typeof createStreaksService>;
