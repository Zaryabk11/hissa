import { describe, expect, it } from 'vitest';
import type { Db } from '../../../shared/db';
import { NotImplementedError } from '../../../shared/errors';
import { createStreaksRepository } from '../streaks.repository';
import { createStreaksService } from '../streaks.service';

describe('streaks service', () => {
  it('getStreak is a stub that reports not implemented', async () => {
    const service = createStreaksService({ repository: createStreaksRepository({} as Db) });
    await expect(service.getStreak()).rejects.toBeInstanceOf(NotImplementedError);
  });
});
