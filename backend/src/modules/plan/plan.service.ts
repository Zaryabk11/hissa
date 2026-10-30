import { NotImplementedError } from '../../shared/errors';
import type { PlanRepository } from './plan.repository';

interface PlanDeps {
  repository: PlanRepository;
}

// Business rules for plan.
export function createPlanService(_deps: PlanDeps) {
  return {
    async buildPlan(): Promise<never> {
      throw new NotImplementedError('plan.buildPlan');
    },
  };
}

export type PlanService = ReturnType<typeof createPlanService>;
