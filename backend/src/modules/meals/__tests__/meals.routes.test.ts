import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '../../../shared/errors';
import { errorHandler } from '../../../shared/middleware/error-handler';
import { createMealsController } from '../meals.controller';
import { createMealsRouter } from '../meals.routes';
import type { MealsService } from '../meals.service';

const id = '11111111-1111-4111-8111-111111111111';
const meal = { id, eatenAt: '2026-11-01T08:00:00.000Z', totalCalories: 200, items: [] };
const item = {
  predictedDish: 'roti',
  predictedPortion: 2,
  confirmedDish: 'roti',
  confirmedPortion: 2,
  confidence: 0.9,
};

function app(userId = 'owner') {
  const service = {
    saveMeal: vi.fn(),
    listToday: vi.fn(),
    weekTotals: vi.fn(async () => ({ days: [] })),
    history: vi.fn(async () => ({ days: [] })),
    getMeal: vi.fn(async () => meal),
    updateMeal: vi.fn(async () => meal),
    deleteMeal: vi.fn(async () => {}),
  };
  const a = express();
  a.use(express.json());
  a.use((req, _res, next) => {
    req.userId = userId;
    next();
  });
  a.use('/api/meals', createMealsRouter(createMealsController(service as unknown as MealsService)));
  a.use(errorHandler);
  return { a, service };
}

describe('meals routes', () => {
  it('GET /week is not captured by /:id', async () => {
    const { a, service } = app();
    const res = await request(a).get('/api/meals/week').expect(200);
    expect(res.body).toEqual({ days: [] });
    expect(service.weekTotals).toHaveBeenCalledWith('owner');
    expect(service.getMeal).not.toHaveBeenCalled();
  });

  it('GET /history passes days, defaults when missing, and 400s a bad value', async () => {
    const { a, service } = app();
    await request(a).get('/api/meals/history?days=30').expect(200);
    expect(service.history).toHaveBeenLastCalledWith('owner', 30);
    await request(a).get('/api/meals/history').expect(200);
    expect(service.history).toHaveBeenLastCalledWith('owner', undefined);
    for (const bad of ['0', '61', '-1', '1.5', 'abc', '']) {
      const res = await request(a).get(`/api/meals/history?days=${bad}`).expect(400);
      expect(res.body.error.code).toBe('validation_error');
    }
  });

  it('GET /:id returns { meal } for the token user; 404 from the service is passed on', async () => {
    const { a, service } = app();
    const res = await request(a).get(`/api/meals/${id}`).expect(200);
    expect(res.body).toEqual({ meal });
    expect(service.getMeal).toHaveBeenCalledWith('owner', id);
    service.getMeal.mockRejectedValueOnce(new NotFoundError());
    const missing = await request(a).get(`/api/meals/${id}`).expect(404);
    expect(missing.body.error.code).toBe('not_found');
  });

  it('a malformed id is a 400 validation_error', async () => {
    const { a, service } = app();
    const res = await request(a).get('/api/meals/not-a-uuid').expect(400);
    expect(res.body.error.code).toBe('validation_error');
    await request(a).delete('/api/meals/not-a-uuid').expect(400);
    expect(service.getMeal).not.toHaveBeenCalled();
    expect(service.deleteMeal).not.toHaveBeenCalled();
  });

  it('PATCH /:id validates items like POST and returns { meal }', async () => {
    const { a, service } = app();
    const res = await request(a)
      .patch(`/api/meals/${id}`)
      .send({ items: [item] })
      .expect(200);
    expect(res.body).toEqual({ meal });
    expect(service.updateMeal).toHaveBeenCalledWith('owner', id, { items: [item] });
    for (const body of [
      {},
      { items: [] },
      { items: [{ ...item, confirmedPortion: 21 }] },
      { items: [{ slug: 'roti', qty: 2 }] },
    ]) {
      const bad = await request(a).patch(`/api/meals/${id}`).send(body).expect(400);
      expect(bad.body.error.code).toBe('validation_error');
    }
    expect(service.updateMeal).toHaveBeenCalledTimes(1);
  });

  it('DELETE /:id returns 204 with no body; 404 passes through', async () => {
    const { a, service } = app();
    const res = await request(a).delete(`/api/meals/${id}`).expect(204);
    expect(res.text).toBe('');
    expect(service.deleteMeal).toHaveBeenCalledWith('owner', id);
    service.deleteMeal.mockRejectedValueOnce(new NotFoundError());
    await request(a).delete(`/api/meals/${id}`).expect(404);
  });
});
