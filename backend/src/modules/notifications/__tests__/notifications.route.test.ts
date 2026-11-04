import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../../shared/middleware/error-handler';
import { createNotificationsController } from '../notifications.controller';
import { createNotificationsRouter } from '../notifications.routes';
import type { NotificationsService } from '../notifications.service';

function app(userId?: string) {
  const service = {
    list: vi.fn(async () => ({ items: [], unread: 0 })),
    markAllRead: vi.fn(async () => {}),
  };
  const a = express();
  a.use((req, _res, next) => {
    if (userId) req.userId = userId;
    next();
  });
  a.use(
    '/api/notifications',
    createNotificationsRouter(
      createNotificationsController(service as unknown as NotificationsService),
    ),
  );
  a.use(errorHandler);
  return { a, service };
}

describe('notifications routes', () => {
  it('GET / returns the callers inbox', async () => {
    const { a, service } = app('u1');
    const res = await request(a).get('/api/notifications').expect(200);
    expect(res.body).toEqual({ items: [], unread: 0 });
    expect(service.list).toHaveBeenCalledWith('u1');
  });

  it('POST /read marks the callers rows read and returns 204', async () => {
    const { a, service } = app('u1');
    await request(a).post('/api/notifications/read').expect(204);
    expect(service.markAllRead).toHaveBeenCalledWith('u1');
  });

  it('401s without a user', async () => {
    const { a, service } = app();
    await request(a).get('/api/notifications').expect(401);
    await request(a).post('/api/notifications/read').expect(401);
    expect(service.list).not.toHaveBeenCalled();
    expect(service.markAllRead).not.toHaveBeenCalled();
  });
});
