import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../../shared/middleware/error-handler';
import { createSnapsController } from '../snaps.controller';
import { createSnapsRouter } from '../snaps.routes';
import type { SnapsService } from '../snaps.service';

const meal = '11111111-1111-4111-8111-111111111111';
const snap = '22222222-2222-4222-8222-222222222222';
const body = {
  mealId: meal,
  image: Buffer.from('hello').toString('base64'),
  mimeType: 'image/jpeg',
};

function app(userId?: string) {
  const service = {
    send: vi.fn(async () => ({
      id: snap,
      expiresAt: '2026-11-07T10:00:00.000Z',
      recipients: { friends: 1 },
    })),
    inbox: vi.fn(async () => ({ items: [] })),
    unsend: vi.fn(async () => {}),
    report: vi.fn(async () => {}),
    open: vi.fn(async () => ({
      image: 'aGVsbG8=',
      mimeType: 'image/jpeg',
      sender: { userId: 'u2', username: 'bob', displayName: 'Bob' },
      sentAt: '2026-11-06T10:00:00.000Z',
      expiresAt: '2026-11-07T10:00:00.000Z',
    })),
  };
  const a = express();
  a.use(express.json());
  a.use((req, _res, next) => {
    if (userId) req.userId = userId;
    next();
  });
  a.use('/api/snaps', createSnapsRouter(createSnapsController(service as unknown as SnapsService)));
  a.use(errorHandler);
  return { a, service };
}

describe('snaps routes', () => {
  it('require an authenticated user', async () => {
    const { a, service } = app();
    await request(a).post('/api/snaps').send(body).expect(401);
    await request(a).get('/api/snaps/inbox').expect(401);
    await request(a).delete(`/api/snaps/${snap}`).expect(401);
    await request(a).post(`/api/snaps/${snap}/open`).expect(401);
    expect(service.send).not.toHaveBeenCalled();
    expect(service.open).not.toHaveBeenCalled();
  });

  it('POST / sends for the caller and answers 201', async () => {
    const { a, service } = app('me');
    const res = await request(a).post('/api/snaps').send(body).expect(201);
    expect(res.body.recipients).toEqual({ friends: 1 });
    expect(service.send).toHaveBeenCalledWith('me', { mealId: meal, image: body.image });
  });

  it('POST / rejects a bad mealId, a missing image or a bad mimeType with 400', async () => {
    const { a, service } = app('me');
    await request(a)
      .post('/api/snaps')
      .send({ ...body, mealId: 'x' })
      .expect(400);
    await request(a).post('/api/snaps').send({ mealId: meal, mimeType: 'image/png' }).expect(400);
    await request(a)
      .post('/api/snaps')
      .send({ ...body, mimeType: 'image/gif' })
      .expect(400);
    await request(a)
      .post('/api/snaps')
      .send({ ...body, image: `data:image/png;base64,${body.image}` })
      .expect(400);
    expect(service.send).not.toHaveBeenCalled();
  });

  it('GET /inbox returns the callers items', async () => {
    const { a, service } = app('me');
    const res = await request(a).get('/api/snaps/inbox').expect(200);
    expect(res.body).toEqual({ items: [] });
    expect(service.inbox).toHaveBeenCalledWith('me');
  });

  it('DELETE /:id unsends with 204; a bad uuid is 400', async () => {
    const { a, service } = app('me');
    await request(a).delete(`/api/snaps/${snap}`).expect(204);
    expect(service.unsend).toHaveBeenCalledWith('me', snap);
    await request(a).delete('/api/snaps/nope').expect(400);
  });

  it('POST /:id/open opens for the caller (ignoring a body user id) with no-store; a bad uuid is 400', async () => {
    const { a, service } = app('me');
    const res = await request(a)
      .post(`/api/snaps/${snap}/open`)
      .send({ userId: 'someone-else' })
      .expect(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.image).toBe('aGVsbG8=');
    expect(service.open).toHaveBeenCalledWith('me', snap);
    await request(a).post('/api/snaps/nope/open').expect(400);
  });

  it('POST /:id/report answers 204 for the caller; a bad reason or uuid is 400', async () => {
    const { a, service } = app('me');
    await request(a).post(`/api/snaps/${snap}/report`).send({ reason: 'spam' }).expect(204);
    expect(service.report).toHaveBeenCalledWith('me', snap, 'spam');
    await request(a).post(`/api/snaps/${snap}/report`).send({ reason: 'rude' }).expect(400);
    await request(a).post(`/api/snaps/${snap}/report`).send({}).expect(400);
    await request(a).post('/api/snaps/nope/report').send({ reason: 'spam' }).expect(400);
    expect(service.report).toHaveBeenCalledTimes(1);
  });
});
