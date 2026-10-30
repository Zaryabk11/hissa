import { NotImplementedError } from '../../shared/errors';
import type { AuthRepository } from './auth.repository';

interface AuthDeps {
  repository: AuthRepository;
}

// Business rules for auth.
export function createAuthService(_deps: AuthDeps) {
  return {
    async getCurrentUser(): Promise<never> {
      throw new NotImplementedError('auth.getCurrentUser');
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
