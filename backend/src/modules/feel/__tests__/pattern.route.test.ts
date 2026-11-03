import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../../shared/middleware/error-handler';
import { createFeelController } from '../feel.controller';
import { createFeelRouter } from '../feel.routes';
import type { FeelService } from '../feel.service';

function app(userId?: string) {
  const getWeeklyPattern = vi.fn(async () => ({ state: 'insufficient_data' }));
  const router = createFeelRouter(
    createFeelController({ getWeeklyPattern } as unknown as FeelService),
  );
  const a = express();
  a.use((req, _res, next) => {
    req.userId = userId;
    next();
  });
  a.use('/api/feel', router);
  a.use(errorHandler);
  return { a, getWeeklyPattern };
}

describe('GET /api/feel/pattern', () => {
  it('uses only the token user and ignores any userId in the request', async () => {
    const { a, getWeeklyPattern } = app('owner');
    const res = await request(a).get('/api/feel/pattern?userId=victim').expect(200);
    expect(res.body).toEqual({ state: 'insufficient_data' });
    expect(getWeeklyPattern).toHaveBeenCalledTimes(1);
    expect(getWeeklyPattern).toHaveBeenCalledWith('owner');
  });
  it('rejects an unauthenticated caller', async () => {
    const { a, getWeeklyPattern } = app();
    await request(a).get('/api/feel/pattern').expect(401);
    expect(getWeeklyPattern).not.toHaveBeenCalled();
  });
});
