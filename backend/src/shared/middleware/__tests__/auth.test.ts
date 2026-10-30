import request from 'supertest';
import { describe, expect, it } from 'vitest';
import express from 'express';
import { createRequireAuth } from '../auth';
import { errorHandler } from '../error-handler';
import type { Db } from '../../db';

describe('requireAuth', () => {
  it('rejects requests without a bearer token', async () => {
    const app = express();
    app.get('/x', createRequireAuth({} as Db), (_req, res) => res.json({ ok: true }));
    app.use(errorHandler);
    const res = await request(app).get('/x');
    expect(res.status).toBe(401);
  });
});
