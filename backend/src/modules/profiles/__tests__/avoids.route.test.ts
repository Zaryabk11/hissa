import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../../shared/middleware/error-handler';
import { createProfilesController } from '../profiles.controller';
import { createProfilesRouter } from '../profiles.routes';
import type { ProfilesService } from '../profiles.service';

function app(userId = 'owner') {
  const getAvoids = vi.fn(async () => ({ proteins: ['beef'], dishes: ['haleem'] }));
  const replaceAvoids = vi.fn(async (_u: string, i: unknown) => i);
  const router = createProfilesRouter(
    createProfilesController({ getAvoids, replaceAvoids } as unknown as ProfilesService),
  );
  const a = express();
  a.use(express.json());
  a.use((req, _res, next) => {
    req.userId = userId;
    next();
  });
  a.use('/api/profiles', router);
  a.use(errorHandler);
  return { a, getAvoids, replaceAvoids };
}

describe('/api/profiles/me/avoids', () => {
  it('GET returns lists for the auth user', async () => {
    const { a, getAvoids } = app();
    const res = await request(a).get('/api/profiles/me/avoids?userId=victim').expect(200);
    expect(res.body).toEqual({ proteins: ['beef'], dishes: ['haleem'] });
    expect(getAvoids).toHaveBeenCalledWith('owner');
  });
  it('PUT saves for the auth user', async () => {
    const { a, replaceAvoids } = app();
    await request(a)
      .put('/api/profiles/me/avoids')
      .send({ proteins: ['fish'], dishes: ['nihari'] })
      .expect(200);
    expect(replaceAvoids).toHaveBeenCalledWith('owner', { proteins: ['fish'], dishes: ['nihari'] });
  });
  it('PUT 400 on protein "pork"', async () => {
    const { a, replaceAvoids } = app();
    await request(a)
      .put('/api/profiles/me/avoids')
      .send({ proteins: ['pork'], dishes: [] })
      .expect(400);
    expect(replaceAvoids).not.toHaveBeenCalled();
  });
});
