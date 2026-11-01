import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { UnauthorizedError } from '../../../shared/errors';
import { createProfilesController } from '../profiles.controller';
import type { ProfilesService } from '../profiles.service';

describe('profiles controller', () => {
  it.each(['getProfile', 'putProfile'])('%s rejects a request without a userId', async (handler) => {
    const service = new Proxy({}, { get: () => vi.fn() }) as unknown as ProfilesService;
    const controller = createProfilesController(service);
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
