import { describe, expect, it } from 'vitest';
import type { Db } from '../../../shared/db';
import { NotImplementedError } from '../../../shared/errors';
import { createProfilesRepository } from '../profiles.repository';
import { createProfilesService } from '../profiles.service';

describe('profiles service', () => {
  it('getProfile is a stub that reports not implemented', async () => {
    const service = createProfilesService({ repository: createProfilesRepository({} as Db) });
    await expect(service.getProfile()).rejects.toBeInstanceOf(NotImplementedError);
  });
});
