import request from 'supertest';
import express from 'express';
import { describe, expect, it } from 'vitest';
import { errorHandler } from '../error-handler';

function appThrowing(err: Error) {
  const app = express();
  app.get('/x', (_req, _res, next) => next(err));
  app.use(errorHandler);
  return app;
}

describe('errorHandler', () => {
  it('maps an exposed 413 (body-parser) to payload_too_large', async () => {
    const err = Object.assign(new Error('request entity too large'), { status: 413, expose: true });
    const res = await request(appThrowing(err)).get('/x');
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('payload_too_large');
    expect(res.body.error.message).toBe('Request body too large');
  });

  it('maps other exposed 4xx errors to bad_request', async () => {
    const err = Object.assign(new Error('bad json'), { status: 400, expose: true });
    const res = await request(appThrowing(err)).get('/x');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('bad_request');
    expect(res.body.error.message).toBe('Bad request');
  });

  it('still returns 500 internal_error for unknown errors', async () => {
    const res = await request(appThrowing(new Error('boom'))).get('/x');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('internal_error');
  });
});
