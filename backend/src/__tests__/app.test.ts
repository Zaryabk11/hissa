import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../app';

// Auth itself is covered in shared/middleware/__tests__/auth.test.ts.
vi.mock('../shared/middleware/auth', () => ({
  createRequireAuth: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

describe('app', () => {
  it('GET /api/health returns ok without auth', async () => {
    const res = await request(createApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('module routes reach the stub service', async () => {
    const res = await request(createApp()).get('/api/scan');
    expect(res.status).toBe(501);
    expect(res.body.error.code).toBe('not_implemented');
  });

  it('unknown routes return 404', async () => {
    const res = await request(createApp()).get('/api/nope');
    expect(res.status).toBe(404);
  });
});
