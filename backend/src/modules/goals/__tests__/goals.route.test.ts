import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../../shared/middleware/error-handler';
import { createGoalsController } from '../goals.controller';
import { createGoalsRouter } from '../goals.routes';
import type { GoalsService } from '../goals.service';

const goalId = '11111111-1111-4111-8111-111111111111';

function app(userId?: string) {
  const service = {
    getMine: vi.fn(async () => null),
    create: vi.fn(async () => ({ id: goalId })),
    update: vi.fn(async () => null),
    celebrations: vi.fn(async () => []),
    cheer: vi.fn(async () => {}),
  };
  const a = express();
  a.use(express.json());
  a.use((req, _res, next) => {
    if (userId) req.userId = userId;
    next();
  });
  a.use('/api/goals', createGoalsRouter(createGoalsController(service as unknown as GoalsService)));
  a.use(errorHandler);
  return { a, service };
}

describe('goals routes', () => {
  it('GET /mine and /celebrations use the callers id', async () => {
    const { a, service } = app('me');
    await request(a).get('/api/goals/mine').expect(200);
    await request(a).get('/api/goals/celebrations').expect(200);
    expect(service.getMine).toHaveBeenCalledWith('me');
    expect(service.celebrations).toHaveBeenCalledWith('me');
  });

  it('POST / creates a goal; shared defaults to false', async () => {
    const { a, service } = app('me');
    await request(a).post('/api/goals').send({ type: 'streak', target: 5 }).expect(201);
    expect(service.create).toHaveBeenCalledWith('me', { type: 'streak', target: 5, shared: false });
    await request(a)
      .post('/api/goals')
      .send({ type: 'window', target: 4, windowDays: 7, shared: true })
      .expect(201);
    expect(service.create).toHaveBeenLastCalledWith('me', {
      type: 'window',
      target: 4,
      windowDays: 7,
      shared: true,
    });
  });

  it('POST / rejects invalid bodies', async () => {
    const { a, service } = app('me');
    const bad = [
      { type: 'streak', target: 5, windowDays: 7 },
      { type: 'streak', target: 1 },
      { type: 'streak', target: 366 },
      { type: 'window', target: 3, windowDays: 91 },
      { type: 'window', target: 3, windowDays: 1 },
      { type: 'window', target: 8, windowDays: 7 },
      { type: 'window', target: 3 },
      { type: 'window', target: 0, windowDays: 7 },
      { type: 'streak', target: 5, userId: 'evil' },
      { type: 'other', target: 3 },
      {},
    ];
    for (const body of bad) await request(a).post('/api/goals').send(body).expect(400);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('PATCH /mine takes shared or abandon only', async () => {
    const { a, service } = app('me');
    await request(a).patch('/api/goals/mine').send({ shared: true }).expect(200);
    expect(service.update).toHaveBeenCalledWith('me', { shared: true });
    await request(a).patch('/api/goals/mine').send({ abandon: true }).expect(200);
    await request(a).patch('/api/goals/mine').send({}).expect(400);
    await request(a).patch('/api/goals/mine').send({ abandon: false }).expect(400);
    await request(a).patch('/api/goals/mine').send({ target: 9 }).expect(400);
  });

  it('POST /:id/cheer is 204 and needs a uuid', async () => {
    const { a, service } = app('me');
    await request(a).post(`/api/goals/${goalId}/cheer`).expect(204);
    expect(service.cheer).toHaveBeenCalledWith('me', goalId);
    await request(a).post('/api/goals/nope/cheer').expect(400);
  });

  it('is 401 without an authenticated user', async () => {
    const { a, service } = app();
    await request(a).get('/api/goals/mine').expect(401);
    await request(a).post('/api/goals').send({ type: 'streak', target: 5 }).expect(401);
    await request(a).post(`/api/goals/${goalId}/cheer`).expect(401);
    expect(service.getMine).not.toHaveBeenCalled();
  });
});
