import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../../shared/middleware/error-handler';
import { createFriendsController } from '../friends.controller';
import { createFriendsRouter } from '../friends.routes';
import type { FriendsService } from '../friends.service';

const other = '11111111-1111-4111-8111-111111111111';

function app(userId?: string) {
  const service = {
    overview: vi.fn(async () => ({ friends: [], loggedCount: 0, incoming: [], outgoing: [] })),
    search: vi.fn(async () => []),
    request: vi.fn(async () => {}),
    respond: vi.fn(async () => {}),
    remove: vi.fn(async () => {}),
    nudge: vi.fn(async () => {}),
  };
  const a = express();
  a.use(express.json());
  a.use((req, _res, next) => {
    if (userId) req.userId = userId;
    next();
  });
  a.use(
    '/api/friends',
    createFriendsRouter(createFriendsController(service as unknown as FriendsService)),
  );
  a.use(errorHandler);
  return { a, service };
}

describe('friends routes', () => {
  it('GET /overview uses the callers id', async () => {
    const { a, service } = app('me');
    await request(a).get('/api/friends/overview').expect(200);
    expect(service.overview).toHaveBeenCalledWith('me');
  });

  it('GET /search passes q; shorter than 3 or missing is 400', async () => {
    const { a, service } = app('me');
    await request(a).get('/api/friends/search?q=abc').expect(200);
    expect(service.search).toHaveBeenCalledWith('me', 'abc');
    await request(a).get('/api/friends/search?q=ab').expect(400);
    await request(a).get('/api/friends/search').expect(400);
    expect(service.search).toHaveBeenCalledTimes(1);
  });

  it('POST /requests takes the username, lowercased, and ignores a body userId', async () => {
    const { a, service } = app('me');
    await request(a)
      .post('/api/friends/requests')
      .send({ username: 'Bob_1', userId: 'evil' })
      .expect(204);
    expect(service.request).toHaveBeenCalledWith('me', 'bob_1');
    await request(a).post('/api/friends/requests').send({ username: 'a b' }).expect(400);
    await request(a).post('/api/friends/requests').send({}).expect(400);
  });

  it('accept, decline, remove and nudge call the service with the uuid param', async () => {
    const { a, service } = app('me');
    await request(a)
      .post(`/api/friends/requests/${other}/accept`)
      .send({ userId: 'evil' })
      .expect(204);
    expect(service.respond).toHaveBeenCalledWith('me', other, 'accept');
    await request(a).post(`/api/friends/requests/${other}/decline`).expect(204);
    expect(service.respond).toHaveBeenCalledWith('me', other, 'decline');
    await request(a).delete(`/api/friends/${other}`).expect(204);
    expect(service.remove).toHaveBeenCalledWith('me', other);
    await request(a).post(`/api/friends/${other}/nudge`).expect(204);
    expect(service.nudge).toHaveBeenCalledWith('me', other);
  });

  it('a :userId that is not a uuid is 400', async () => {
    const { a, service } = app('me');
    await request(a).post('/api/friends/requests/nope/accept').expect(400);
    await request(a).post('/api/friends/requests/nope/decline').expect(400);
    await request(a).delete('/api/friends/nope').expect(400);
    await request(a).post('/api/friends/nope/nudge').expect(400);
    expect(service.respond).not.toHaveBeenCalled();
    expect(service.remove).not.toHaveBeenCalled();
    expect(service.nudge).not.toHaveBeenCalled();
  });

  it('401s without a user', async () => {
    const { a, service } = app();
    await request(a).get('/api/friends/overview').expect(401);
    await request(a).get('/api/friends/search?q=abc').expect(401);
    await request(a).post('/api/friends/requests').send({ username: 'bob' }).expect(401);
    await request(a).post(`/api/friends/requests/${other}/accept`).expect(401);
    await request(a).delete(`/api/friends/${other}`).expect(401);
    await request(a).post(`/api/friends/${other}/nudge`).expect(401);
    for (const fn of Object.values(service)) expect(fn).not.toHaveBeenCalled();
  });
});
