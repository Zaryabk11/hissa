import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../../shared/middleware/error-handler';
import { createRecipesController } from '../recipes.controller';
import { createRecipesRouter } from '../recipes.routes';
import { createRecipesService } from '../recipes.service';
import { dish, row } from './fixtures';

const ID = '11111111-1111-4111-8111-111111111111';

function app(userId = 'owner') {
  const repository = {
    listReviewed: vi.fn(async () => [row(ID, 'daal')]),
    findReviewed: vi.fn(async (id: string) => (id === ID ? row(ID, 'daal') : null)),
    listNotForMe: vi.fn(async () => []),
    addNotForMe: vi.fn(async () => {}),
    removeNotForMe: vi.fn(async () => {}),
  };
  const service = createRecipesService({
    repository,
    profiles: {
      getAvoids: async () => ({ proteins: [], dishes: [] }),
      getDailyBudget: async () => 1800,
    },
    meals: { caloriesToday: async () => 0, dishCounts: async () => ({}) },
    feel: { getWeeklyPattern: async () => ({ state: 'insufficient_data', pattern: null }) },
    nutrition: { listCatalog: async () => [dish('daal')] },
  } as unknown as Parameters<typeof createRecipesService>[0]);
  const a = express();
  a.use(express.json());
  a.use((req, _res, next) => {
    req.userId = userId;
    next();
  });
  a.use('/api/recipes', createRecipesRouter(createRecipesController(service)));
  a.use(errorHandler);
  return { a, repository };
}

describe('/api/recipes', () => {
  it('GET lists ranked cards with the remaining calories', async () => {
    const { a } = app();
    const res = await request(a).get('/api/recipes').expect(200);
    expect(res.body).toMatchObject({ remainingCalories: 1800, isEstimate: true });
    expect(res.body.recipes[0]).toMatchObject({ id: ID, dish: 'daal', kcalPerUnit: 150 });
  });
  it('GET detail returns steps and flags', async () => {
    const { a } = app();
    const res = await request(a).get(`/api/recipes/${ID}`).expect(200);
    expect(res.body).toMatchObject({ steps: ['Cook.'], notForMe: false, avoided: false });
  });
  it('400 on a non-uuid id, 404 on an unknown one', async () => {
    const { a, repository } = app();
    await request(a).get('/api/recipes/abc').expect(400);
    await request(a).post('/api/recipes/abc/not-for-me').expect(400);
    await request(a).delete('/api/recipes/abc/not-for-me').expect(400);
    await request(a).get('/api/recipes/22222222-2222-4222-8222-222222222222').expect(404);
    expect(repository.findReviewed).toHaveBeenCalledTimes(1);
  });
  it('POST not-for-me twice is 204 both times, scoped to the auth user', async () => {
    const { a, repository } = app();
    await request(a)
      .post(`/api/recipes/${ID}/not-for-me?userId=victim`)
      .send({ userId: 'victim' })
      .expect(204);
    await request(a).post(`/api/recipes/${ID}/not-for-me`).expect(204);
    expect(repository.addNotForMe).toHaveBeenCalledTimes(2);
    expect(repository.addNotForMe).toHaveBeenCalledWith('owner', ID);
  });
  it('POST 404s for a recipe that is not served', async () => {
    const { a, repository } = app();
    await request(a)
      .post('/api/recipes/22222222-2222-4222-8222-222222222222/not-for-me')
      .expect(404);
    expect(repository.addNotForMe).not.toHaveBeenCalled();
  });
  it('DELETE without a row is 204, scoped to the auth user', async () => {
    const { a, repository } = app();
    await request(a).delete(`/api/recipes/${ID}/not-for-me`).expect(204);
    expect(repository.removeNotForMe).toHaveBeenCalledWith('owner', ID);
  });
});
