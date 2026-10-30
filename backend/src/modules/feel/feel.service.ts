import { NotImplementedError } from '../../shared/errors';
import type { FeelRepository } from './feel.repository';

interface FeelDeps {
  repository: FeelRepository;
}

// Business rules for feel.
export function createFeelService(_deps: FeelDeps) {
  return {
    async submitCheckin(): Promise<never> {
      throw new NotImplementedError('feel.submitCheckin');
    },
  };
}

export type FeelService = ReturnType<typeof createFeelService>;
