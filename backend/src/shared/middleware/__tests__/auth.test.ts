import request from 'supertest';
import { describe, expect, it } from 'vitest';
import express from 'express';
import { createRequireAuth } from '../auth';
import { errorHandler } from '../error-handler';
import type { Db } from '../../db';

type GetUserResult = { data: { user: { id: string } | null }; error: { status?: number } | null };

function appWith(getUser: () => Promise<GetUserResult>) {
  const app = express();
  const db = { auth: { getUser } } as unknown as Db;
  app.get('/x', createRequireAuth(db), (req, res) => res.json({ userId: req.userId }));
  app.use(errorHandler);
  return app;
}
const failWith = (status?: number) => () =>
  Promise.resolve({ data: { user: null }, error: { status } });
const bearer = { authorization: 'Bearer t' };

describe('requireAuth', () => {
  it('rejects requests without a bearer token', async () => {
    const app = express();
    app.get('/x', createRequireAuth({} as Db), (_req, res) => res.json({ ok: true }));
    app.use(errorHandler);
    const res = await request(app).get('/x');
    expect(res.status).toBe(401);
  });

  it.each([400, 401, 403])('401 when Supabase rejects the token with %i', async (status) => {
    const res = await request(appWith(failWith(status))).get('/x').set(bearer);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });

  it.each([0, 500, 503, undefined])('503 when the auth service fails with %s', async (status) => {
    const res = await request(appWith(failWith(status))).get('/x').set(bearer);
    expect(res.status).toBe(503);
    expect(res.body.error).toEqual({
      code: 'auth_unavailable',
      message: 'Authentication service unavailable',
    });
  });

  it('sets req.userId for a valid token', async () => {
    const ok = () => Promise.resolve({ data: { user: { id: 'u1' } }, error: null });
    const res = await request(appWith(ok)).get('/x').set(bearer);
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('u1');
  });
});
