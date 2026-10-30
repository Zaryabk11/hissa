import { describe, expect, it } from 'vitest';
import type { Db } from '../../../shared/db';
import { NotImplementedError } from '../../../shared/errors';
import { createPlanRepository } from '../plan.repository';
import { createPlanService } from '../plan.service';

describe('plan service', () => {
  it('buildPlan is a stub that reports not implemented', async () => {
    const service = createPlanService({ repository: createPlanRepository({} as Db) });
    await expect(service.buildPlan()).rejects.toBeInstanceOf(NotImplementedError);
  });
});
