import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { ConflictError } from '../../../shared/errors';
import { errorHandler } from '../../../shared/middleware/error-handler';
import { createFeelController } from '../feel.controller';
import { createFeelRouter } from '../feel.routes';
import type { FeelService } from '../feel.service';

const id = '11111111-1111-4111-8111-111111111111';
const mealId = '22222222-2222-4222-8222-222222222222';
const experiment = { id, status: 'active' };
function app(userId?: string) {
  const service = {
    createExperiment: vi.fn(async () => experiment),
    getCurrentExperiment: vi.fn(async () => null),
    markExperimentTried: vi.fn(async () => ({ id, status: 'tried' })),
  };
  const a = express();
  a.use(express.json());
  a.use((req, _res, next) => {
    req.userId = userId;
    next();
  });
  a.use('/api/feel', createFeelRouter(createFeelController(service as unknown as FeelService)));
  a.use(errorHandler);
  return { a, service };
}

describe('experiment routes', () => {
  it('POST /experiments creates for the token user only', async () => {
    const { a, service } = app('owner');
    const res = await request(a)
      .post('/api/feel/experiments')
      .send({ patternKey: 'category:rice:heavy', action: 'smaller_portion' })
      .expect(201);
    expect(res.body).toEqual({ experiment });
    expect(service.createExperiment).toHaveBeenCalledWith(
      'owner',
      'category:rice:heavy',
      'smaller_portion',
    );
  });

  it.each([
    { patternKey: 'k', action: 'skip_dinner' },
    { patternKey: '', action: 'observe_again' },
    { action: 'observe_again' },
    { patternKey: 'k', action: 'observe_again', userId: 'victim' },
  ])('rejects a bad create body %j', async (body) => {
    const { a, service } = app('owner');
    await request(a).post('/api/feel/experiments').send(body).expect(400);
    expect(service.createExperiment).not.toHaveBeenCalled();
  });

  it('GET /experiments/current wraps null', async () => {
    const { a, service } = app('owner');
    const res = await request(a).get('/api/feel/experiments/current?userId=victim').expect(200);
    expect(res.body).toEqual({ experiment: null });
    expect(service.getCurrentExperiment).toHaveBeenCalledWith('owner');
  });

  it('POST /experiments/:id/tried passes the token user, id and meal', async () => {
    const { a, service } = app('owner');
    const res = await request(a)
      .post(`/api/feel/experiments/${id}/tried`)
      .send({ mealId })
      .expect(200);
    expect(res.body).toEqual({ experiment: { id, status: 'tried' } });
    expect(service.markExperimentTried).toHaveBeenCalledWith('owner', id, mealId);
  });

  it.each([
    ['/api/feel/experiments/not-a-uuid/tried', { mealId }],
    [`/api/feel/experiments/${id}/tried`, { mealId: 'x' }],
    [`/api/feel/experiments/${id}/tried`, {}],
  ])('rejects bad tried input %s %j', async (path, body) => {
    const { a, service } = app('owner');
    await request(a).post(path).send(body).expect(400);
    expect(service.markExperimentTried).not.toHaveBeenCalled();
  });

  it('turns a conflict into 409', async () => {
    const { a, service } = app('owner');
    service.createExperiment.mockRejectedValueOnce(new ConflictError('x'));
    const res = await request(a)
      .post('/api/feel/experiments')
      .send({ patternKey: 'k', action: 'observe_again' })
      .expect(409);
    expect(res.body.error.code).toBe('conflict');
  });

  it('rejects an unauthenticated caller on all three', async () => {
    const { a, service } = app();
    await request(a)
      .post('/api/feel/experiments')
      .send({ patternKey: 'k', action: 'observe_again' })
      .expect(401);
    await request(a).get('/api/feel/experiments/current').expect(401);
    await request(a).post(`/api/feel/experiments/${id}/tried`).send({ mealId }).expect(401);
    expect(service.createExperiment).not.toHaveBeenCalled();
  });
});
