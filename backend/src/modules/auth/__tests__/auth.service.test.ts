import { describe, expect, it } from 'vitest';
import type { Db } from '../../../shared/db';
import { NotImplementedError } from '../../../shared/errors';
import { createAuthRepository } from '../auth.repository';
import { createAuthService } from '../auth.service';

describe('auth service', () => {
  it('getCurrentUser is a stub that reports not implemented', async () => {
    const service = createAuthService({ repository: createAuthRepository({} as Db) });
    await expect(service.getCurrentUser()).rejects.toBeInstanceOf(NotImplementedError);
  });
});
