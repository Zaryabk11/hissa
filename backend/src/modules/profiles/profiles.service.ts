import { NotImplementedError } from '../../shared/errors';
import type { ProfilesRepository } from './profiles.repository';

interface ProfilesDeps {
  repository: ProfilesRepository;
}

// Business rules for profiles.
export function createProfilesService(_deps: ProfilesDeps) {
  return {
    async getProfile(): Promise<never> {
      throw new NotImplementedError('profiles.getProfile');
    },
  };
}

export type ProfilesService = ReturnType<typeof createProfilesService>;
