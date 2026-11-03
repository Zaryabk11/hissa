import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../../shared/middleware/error-handler';
import { createFeelController } from '../feel.controller';
import { createFeelRouter } from '../feel.routes';
import type { FeelService } from '../feel.service';

const mealId = '11111111-1111-4111-8111-111111111111';
function app(userId?: string) {
  const getQuestion = vi.fn(async () => ({ mealId }));
  const router = createFeelRouter(createFeelController({ getQuestion } as unknown as FeelService));
  const a = express();
  a.use((req, _res, next) => {
    req.userId = userId;
    next();
  });
  a.use('/api/feel', router);
  a.use(errorHandler);
  return { a, getQuestion };
}

describe('GET /api/feel/question/:mealId', () => {
  it('uses only the token user and the path meal id', async () => {
    const { a, getQuestion } = app('owner');
    await request(a).get(`/api/feel/question/${mealId}?userId=victim`).expect(200);
    expect(getQuestion).toHaveBeenCalledWith('owner', mealId);
  });
  it('rejects a non-uuid meal id and an unauthenticated caller', async () => {
    await request(app('owner').a).get('/api/feel/question/nope').expect(400);
    await request(app().a).get(`/api/feel/question/${mealId}`).expect(401);
  });
});
