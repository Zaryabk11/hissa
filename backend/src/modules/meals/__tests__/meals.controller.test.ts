import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { UnauthorizedError } from '../../../shared/errors';
import { createMealsController } from '../meals.controller';
import type { MealsService } from '../meals.service';

describe('meals controller', () => {
  it.each(['saveMeal', 'listToday'])('%s rejects a request without a userId', async (handler) => {
    const service = new Proxy({}, { get: () => vi.fn() }) as unknown as MealsService;
    const controller = createMealsController(service);
    const res = { json: vi.fn(), status: vi.fn() } as unknown as Response;
    await expect(
      (
        controller[handler as keyof typeof controller] as (q: Request, r: Response) => Promise<void>
      )({ body: {} } as Request, res),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    expect(res.json).not.toHaveBeenCalled();
  });
});
