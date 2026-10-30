import type { Router } from 'express';
import type { Db } from '../../shared/db';
import { createPlanController } from './plan.controller';
import { createPlanRepository } from './plan.repository';
import { createPlanRouter } from './plan.routes';
import { createPlanService, type PlanService } from './plan.service';

export type { PlanService };

// The only file other modules may import.
export function createPlanModule({ db }: { db: Db }): { router: Router; service: PlanService } {
  const service = createPlanService({
    repository: createPlanRepository(db),
  });
  const router = createPlanRouter(createPlanController(service));
  return { router, service };
}
