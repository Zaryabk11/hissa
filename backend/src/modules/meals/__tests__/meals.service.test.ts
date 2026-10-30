import { describe, expect, it } from 'vitest';
import type { Db } from '../../../shared/db';
import { NotImplementedError } from '../../../shared/errors';
import { createMealsRepository } from '../meals.repository';
import { createMealsService } from '../meals.service';

describe('meals service', () => {
  it('saveMeal is a stub that reports not implemented', async () => {
    const service = createMealsService({ repository: createMealsRepository({} as Db) });
    await expect(service.saveMeal()).rejects.toBeInstanceOf(NotImplementedError);
  });
});
