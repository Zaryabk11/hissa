import { describe, expect, it } from 'vitest';
import type { Db } from '../../../shared/db';
import { NotImplementedError } from '../../../shared/errors';
import { createNutritionRepository } from '../nutrition.repository';
import { createNutritionService } from '../nutrition.service';
import { createFatSecretClient } from '../fatsecret.client';

describe('nutrition service', () => {
  it('getServingNutrition is a stub that reports not implemented', async () => {
    const service = createNutritionService({
      repository: createNutritionRepository({} as Db),
      fatsecret: createFatSecretClient('id', 'secret'),
    });
    await expect(service.getServingNutrition()).rejects.toBeInstanceOf(NotImplementedError);
  });
});
