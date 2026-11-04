import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app';

// Unlike app.test.ts, this file keeps the real auth middleware.
describe('app auth on social routes', () => {
  it.each(['/api/friends/overview', '/api/goals/mine', '/api/notifications'])(
    'GET %s returns 401 without a token',
    async (path) => {
      expect((await request(createApp()).get(path)).status).toBe(401);
    },
  );
});
