import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../app';

// Auth itself is covered in shared/middleware/__tests__/auth.test.ts.
vi.mock('../shared/middleware/auth', () => ({
  createRequireAuth: () => (req: { userId?: string }, _res: unknown, next: () => void) => {
    req.userId = 'u1';
    next();
  },
}));

describe('app', () => {
  it('allows the Expo web preflight and the subsequent API response', async () => {
    const preflight = await request(createApp())
      .options('/api/profiles/me')
      .set('Origin', 'http://localhost:8081')
      .set('Access-Control-Request-Method', 'PUT')
      .set('Access-Control-Request-Headers', 'authorization,content-type');
    expect(preflight.status).toBe(204);
    expect(preflight.headers['access-control-allow-origin']).toBe('*');
    const methods = (preflight.headers['access-control-allow-methods'] ?? '').split(/,\s*/);
    expect(methods).toEqual(
      expect.arrayContaining(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']),
    );
    expect((preflight.headers['access-control-allow-headers'] ?? '').toLowerCase()).toContain(
      'authorization',
    );

    const response = await request(createApp())
      .get('/api/auth')
      .set('Origin', 'http://localhost:8081');
    expect(response.headers['access-control-allow-origin']).toBe('*');
  });

  it('GET /api/health returns ok without auth', async () => {
    const res = await request(createApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /api/auth returns only the authenticated user id', async () => {
    const res = await request(createApp()).get('/api/auth');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 'u1' });
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
