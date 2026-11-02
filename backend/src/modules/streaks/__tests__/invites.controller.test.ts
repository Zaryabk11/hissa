import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../../shared/middleware/error-handler';
import { createStreaksController } from '../streaks.controller';
import { createStreaksRouter } from '../streaks.routes';
import type { StreaksService } from '../streaks.service';
function setup(auth = true) {
  const service = {
    createInvite: vi.fn().mockResolvedValue({ code: 'ABC123', linkPath: '/invite/ABC123' }),
    previewInvite: vi.fn().mockResolvedValue({ code: 'ABC123', status: 'pending' }),
    respondInvite: vi.fn().mockResolvedValue(undefined),
    endPair: vi.fn().mockResolvedValue(undefined),
  };
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (auth) req.userId = 'actor';
    next();
  });
  app.use(createStreaksRouter(createStreaksController(service as unknown as StreaksService)));
  app.use(errorHandler);
  return { app, service };
}
describe('invite routes', () => {
  it('passes only authenticated identity to every action', async () => {
    const { app, service } = setup();
    expect((await request(app).post('/invites').send({ userId: 'attacker' })).status).toBe(201);
    expect((await request(app).get('/invites/ABC123')).status).toBe(200);
    for (const decision of ['accept', 'decline'])
      expect((await request(app).post(`/invites/ABC123/${decision}`)).status).toBe(204);
    expect((await request(app).post('/end')).status).toBe(204);
    expect(service.createInvite).toHaveBeenCalledWith('actor');
    expect(service.previewInvite).toHaveBeenCalledWith('actor', 'ABC123');
    expect(service.respondInvite).toHaveBeenCalledWith('actor', 'ABC123', 'accept');
    expect(service.respondInvite).toHaveBeenCalledWith('actor', 'ABC123', 'decline');
    expect(service.endPair).toHaveBeenCalledWith('actor');
  });
  it.each(['get', 'accept', 'decline'])('rejects malformed code on %s', async (action) => {
    const { app } = setup();
    const response =
      action === 'get'
        ? await request(app).get('/invites/bad')
        : await request(app).post(`/invites/bad/${action}`);
    expect(response.status).toBe(400);
  });
  it('requires identity', async () => {
    const { app } = setup(false);
    expect((await request(app).post('/invites')).status).toBe(401);
  });
});
