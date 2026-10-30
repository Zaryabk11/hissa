import { describe, expect, it } from 'vitest';
import type { Db } from '../../../shared/db';
import { NotImplementedError } from '../../../shared/errors';
import { createFeelRepository } from '../feel.repository';
import { createFeelService } from '../feel.service';

describe('feel service', () => {
  it('submitCheckin is a stub that reports not implemented', async () => {
    const service = createFeelService({ repository: createFeelRepository({} as Db) });
    await expect(service.submitCheckin()).rejects.toBeInstanceOf(NotImplementedError);
  });
});
