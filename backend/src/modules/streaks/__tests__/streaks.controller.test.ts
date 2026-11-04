import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { UnauthorizedError } from '../../../shared/errors';
import { createStreaksController } from '../streaks.controller';
import type { StreaksService } from '../streaks.service';

function setup() {
  const getStreaks = vi.fn(async () => ({ u1: { streak: 3, loggedToday: true } }));
  const controller = createStreaksController({ getStreaks } as unknown as StreaksService);
  const res = { json: vi.fn() } as unknown as Response;
  return { controller, getStreaks, res };
}

describe('streaks controller', () => {
  it('rejects a request without a userId', async () => {
    const { controller, getStreaks, res } = setup();
    await expect(controller.getOwn({} as Request, res)).rejects.toBeInstanceOf(UnauthorizedError);
    expect(getStreaks).not.toHaveBeenCalled();
  });

  it('returns only the callers own DayStreak', async () => {
    const { controller, getStreaks, res } = setup();
    await controller.getOwn({ userId: 'u1' } as Request, res);
    expect(getStreaks).toHaveBeenCalledWith(['u1']);
    expect(res.json).toHaveBeenCalledWith({ streak: 3, loggedToday: true });
  });
});
