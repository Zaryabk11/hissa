import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { UnauthorizedError } from '../../../shared/errors';
import { createPlanController } from '../plan.controller';
import type { PlanService } from '../plan.service';

describe('plan controller', () => {
  it.each(['buildPlan'])('%s rejects a request without a userId', async (handler) => {
    const service = new Proxy({}, { get: () => vi.fn() }) as unknown as PlanService;
    const controller = createPlanController(service);
    const res = { json: vi.fn(), status: vi.fn() } as unknown as Response;
    await expect(
      (controller[handler as keyof typeof controller] as (q: Request, r: Response) => Promise<void>)(
        { body: {} } as Request,
        res,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    expect(res.json).not.toHaveBeenCalled();
  });
});
