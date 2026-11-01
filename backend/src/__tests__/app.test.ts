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
    const res = await request(createApp()).get('/api/streaks');
    expect(res.status).toBe(501);
    expect(res.body.error.code).toBe('not_implemented');
  });

  it('POST /api/scan with an oversized body returns 413', async () => {
    const res = await request(createApp())
      .post('/api/scan')
      .send({ image: 'a'.repeat(9_000_000) });
    expect(res.status).toBe(413);
  });

  it('rejects a 200 KB body on a non-scan route with 413', async () => {
    const res = await request(createApp())
      .post('/api/plan')
      .send({ pad: 'a'.repeat(200_000) });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('payload_too_large');
  });

  it('POST /api/scan with an invalid mimeType returns 400', async () => {
    const res = await request(createApp())
      .post('/api/scan')
      .send({ image: 'abc', mimeType: 'image/gif' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_error');
  });

  it('unknown routes return 404', async () => {
    const res = await request(createApp()).get('/api/nope');
    expect(res.status).toBe(404);
  });
});
