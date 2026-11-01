import { describe, expect, it } from 'vitest';
import type { Db } from '../../../shared/db';
import { NotImplementedError } from '../../../shared/errors';
import { createScanRepository } from '../scan.repository';
import { createScanService } from '../scan.service';
import { createGeminiClient } from '../gemini.client';

describe('scan service', () => {
  it('detectDishes is a stub that reports not implemented', async () => {
    const service = createScanService({
      repository: createScanRepository({} as Db),
      gemini: createGeminiClient({ apiKey: 'key', model: 'm' }),
    });
    await expect(service.detectDishes()).rejects.toBeInstanceOf(NotImplementedError);
  });
});
