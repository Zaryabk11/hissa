import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { Db } from '../../../shared/db';
import { ConflictError, ValidationError } from '../../../shared/errors';
import { errorHandler } from '../../../shared/middleware/error-handler';
import { createProfilesController } from '../profiles.controller';
import { createProfilesRepository, type ProfilesRepository } from '../profiles.repository';
import { createProfilesRouter } from '../profiles.routes';
import { createProfilesService } from '../profiles.service';
import type { CardRow, ProfileRow } from '../profiles.types';

function setup() {
  const repository = {
    upsertProfile: vi.fn(async (r: Omit<ProfileRow, 'username'>) => ({ ...r, username: 'ayesha' })),
    findProfile: vi.fn(async (_id: string) => null as ProfileRow | null),
    setUsername: vi.fn(async (_id: string, _name: string) => true),
    searchUsernames: vi.fn(async (_prefix: string, _limit: number) => [] as CardRow[]),
    findCards: vi.fn(async (_ids: string[]) => [] as CardRow[]),
  };
  const service = createProfilesService({
    repository: repository as unknown as ProfilesRepository,
  });
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.userId = 'u1';
    next();
  });
  app.use('/api/profiles', createProfilesRouter(createProfilesController(service)));
  app.use(errorHandler);
  return { repository, service, app };
}

describe('usernames', () => {
  it.each(['Ab', 'UPPER_case', 'has space', 'a'.repeat(21), '', 'admin!'])(
    'setUsername rejects %j with a ValidationError',
    async (name) => {
      const { repository, service } = setup();
      await expect(service.setUsername('u1', name)).rejects.toBeInstanceOf(ValidationError);
      expect(repository.setUsername).not.toHaveBeenCalled();
    },
  );

  it('maps a unique violation (23505) to ConflictError', async () => {
    const { repository, service } = setup();
    repository.setUsername.mockRejectedValueOnce({ code: '23505' });
    await expect(service.setUsername('u1', 'ayesha')).rejects.toEqual(
      new ConflictError('Username taken'),
    );
  });

  it('rethrows other repository errors', async () => {
    const { repository, service } = setup();
    repository.setUsername.mockRejectedValueOnce(new Error('boom'));
    await expect(service.setUsername('u1', 'ayesha')).rejects.toThrow('boom');
  });

  it('PUT /me/username returns 204 and passes only req.userId and the name', async () => {
    const { repository, app } = setup();
    const res = await request(app)
      .put('/api/profiles/me/username')
      .send({ username: 'ayesha', userId: 'evil' });
    expect(res.status).toBe(204);
    expect(repository.setUsername).toHaveBeenCalledWith('u1', 'ayesha');
  });

  it('PUT /me/username answers 400 for a bad name and 409 for a taken one', async () => {
    const { repository, app } = setup();
    expect(
      (await request(app).put('/api/profiles/me/username').send({ username: 'Ab' })).status,
    ).toBe(400);
    repository.setUsername.mockRejectedValueOnce({ code: '23505' });
    expect(
      (await request(app).put('/api/profiles/me/username').send({ username: 'ayesha' })).status,
    ).toBe(409);
  });

  it('PUT /me/username answers 404 when the user has no profile row yet', async () => {
    const { repository, app } = setup();
    repository.setUsername.mockResolvedValueOnce(false);
    expect(
      (await request(app).put('/api/profiles/me/username').send({ username: 'ayesha' })).status,
    ).toBe(404);
  });

  it('PUT /me does not write username', async () => {
    const { repository, app } = setup();
    const res = await request(app).put('/api/profiles/me').send({
      goal: 'maintain',
      sex: 'female',
      age: 25,
      heightCm: 160,
      weightKg: 60,
      activityLevel: 'sedentary',
      username: 'hacker',
    });
    expect(res.status).toBe(200);
    expect(repository.upsertProfile).toHaveBeenCalledTimes(1);
    const row = repository.upsertProfile.mock.calls[0]?.[0];
    expect(row).not.toHaveProperty('username');
  });

  it('GET /me includes username', async () => {
    const { repository, app } = setup();
    repository.findProfile.mockResolvedValueOnce({
      id: 'u1',
      username: 'ayesha',
      display_name: null,
      goal: 'maintain',
      sex: 'female',
      age: 25,
      height_cm: 160,
      weight_kg: 60,
      activity_level: 'sedentary',
      daily_calorie_budget: 1577,
    });
    const res = await request(app).get('/api/profiles/me');
    expect(res.body.username).toBe('ayesha');
  });

  it('searchUsernames lowercases the prefix and maps rows to person cards', async () => {
    const { repository, service } = setup();
    repository.searchUsernames.mockResolvedValueOnce([
      { id: 'u2', username: 'ayesha', display_name: 'Ayesha' } as CardRow,
    ]);
    expect(await service.searchUsernames('AYE', 10)).toEqual([
      { userId: 'u2', username: 'ayesha', displayName: 'Ayesha' },
    ]);
    expect(repository.searchUsernames).toHaveBeenCalledWith('aye', 10);
  });

  it.each(['a*b', '***', '', 'a b', 'a%'])(
    'searchUsernames(%j) returns [] without querying',
    async (prefix) => {
      const { repository, service } = setup();
      expect(await service.searchUsernames(prefix, 10)).toEqual([]);
      expect(repository.searchUsernames).not.toHaveBeenCalled();
    },
  );

  it('repository escapes _ in the ilike pattern', async () => {
    const q = {
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn(async () => ({ data: [], error: null })),
    };
    const db = { from: vi.fn(() => q) } as unknown as Db;
    await createProfilesRepository(db).searchUsernames('a_b', 10);
    expect(q.ilike).toHaveBeenCalledWith('username', 'a\\_b%');
  });

  it('getCards([]) returns [] without querying', async () => {
    const { repository, service } = setup();
    expect(await service.getCards([])).toEqual([]);
    expect(repository.findCards).not.toHaveBeenCalled();
  });

  it('getCards maps rows to person cards', async () => {
    const { repository, service } = setup();
    repository.findCards.mockResolvedValueOnce([
      { id: 'u2', username: null, display_name: null } as CardRow,
    ]);
    expect(await service.getCards(['u2'])).toEqual([
      { userId: 'u2', username: null, displayName: null },
    ]);
  });
});
