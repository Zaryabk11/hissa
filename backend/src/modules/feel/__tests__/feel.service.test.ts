import { describe, expect, it } from 'vitest';
import { createFeelService } from '../feel.service';
import { checkinBodySchema } from '../feel.schemas';
import type { FeelRepository } from '../feel.repository';

const now = new Date('2026-11-02T12:00:00Z');
const mealId = '11111111-1111-4111-8111-111111111111';
const input = { mealId, energy: 'okay' as const, stomach: 'fine' as const };
function setup(ageMinutes = 90, dishes = ['raita'], insertError?: unknown) {
  const meal = {
    id: mealId,
    eatenAt: new Date(now.getTime() - ageMinutes * 60000).toISOString(),
    dishes,
    checkedIn: false,
  };
  const saved: unknown[] = [];
  const repository: FeelRepository = {
    async listCandidates(userId) {
      return userId === 'owner' ? [meal] : [];
    },
    async findMeal(userId, id) {
      return userId === 'owner' && id === mealId ? meal : null;
    },
    async insertCheckin(userId, value) {
      if (insertError) throw insertError;
      saved.push({ userId, ...value });
      meal.checkedIn = true;
      return { id: 'checkin' };
    },
    async listObservations() {
      return [];
    },
  };
  return { service: createFeelService({ repository }), saved };
}

describe('timely whole-meal check-ins', () => {
  it.each([
    [89, false],
    [90, true],
    [1440, true],
    [1441, false],
    [1500, false],
  ])('meal age %i minutes has due=%s', async (minutes, due) => {
    const { service } = setup(minutes);
    expect((await service.getDue('owner', now)) !== null).toBe(due);
  });
  it('does not expose another owner’s meal', async () => {
    expect(await setup().service.getDue('other', now)).toBeNull();
  });
  it('does not ask about a meal with no confirmed dishes', async () => {
    expect(await setup(90, []).service.getDue('owner', now)).toBeNull();
  });
  it('offers a newer due meal when the older one is skipped', async () => {
    const at = (minutes: number) => new Date(now.getTime() - minutes * 60000).toISOString();
    const meals = [
      { id: 'older', eatenAt: at(300), dishes: ['roti'], checkedIn: false },
      { id: 'newer', eatenAt: at(120), dishes: ['dal'], checkedIn: false },
    ];
    const service = createFeelService({
      repository: { listCandidates: async () => meals } as unknown as FeelRepository,
    });
    expect((await service.getDue('owner', now))?.mealId).toBe('older');
    expect((await service.getDue('owner', now, ['older']))?.mealId).toBe('newer');
    expect(await service.getDue('owner', now, ['older', 'newer'])).toBeNull();
  });
  it('turns a duplicate-check-in database error into a 400', async () => {
    const { service } = setup(90, ['raita'], { code: '23505' });
    await expect(service.submitCheckin('owner', input, now)).rejects.toMatchObject({ status: 400 });
  });
  it('lets other database errors through', async () => {
    const { service } = setup(90, ['raita'], new Error('db down'));
    await expect(service.submitCheckin('owner', input, now)).rejects.toThrow('db down');
  });
  it('rejects another owner’s meal on submission', async () => {
    const { service, saved } = setup();
    await expect(service.submitCheckin('other', input, now)).rejects.toMatchObject({ status: 404 });
    expect(saved).toEqual([]);
  });
  it.each([89, 1441])('rejects a submission at %i minutes', async (minutes) => {
    const { service, saved } = setup(minutes);
    await expect(service.submitCheckin('owner', input, now)).rejects.toMatchObject({ status: 400 });
    expect(saved).toEqual([]);
  });
  it('saves the whole meal, leaves skipped symptom null, and removes it from due', async () => {
    const { service, saved } = setup();
    expect(await service.getDue('owner', now)).toEqual({
      mealId,
      eatenAt: '2026-11-02T10:30:00.000Z',
      dishes: ['raita'],
    });
    await expect(service.submitCheckin('owner', input, now)).resolves.toEqual({ id: 'checkin' });
    expect(saved).toEqual([{ userId: 'owner', ...input, symptom: null }]);
    expect(await service.getDue('owner', now)).toBeNull();
    await expect(service.submitCheckin('owner', input, now)).rejects.toMatchObject({ status: 400 });
    expect(saved).toHaveLength(1);
  });
  it.each(['bloated', 'upset', 'other', 'not_sure'])(
    'accepts optional symptom %s',
    async (symptom) => {
      const { service, saved } = setup();
      await service.submitCheckin(
        'owner',
        { ...input, symptom } as Parameters<typeof service.submitCheckin>[1],
        now,
      );
      expect(saved).toEqual([{ userId: 'owner', ...input, symptom }]);
    },
  );
  it.each([{ energy: 'excellent' }, { stomach: 'painful' }, { symptom: 'diagnosis' }])(
    'rejects invalid answers %j at schema and service boundaries',
    async (invalid) => {
      const body = { ...input, ...invalid };
      expect(checkinBodySchema.safeParse(body).success).toBe(false);
      const { service, saved } = setup();
      await expect(service.submitCheckin('owner', body as typeof input, now)).rejects.toMatchObject(
        { status: 400 },
      );
      expect(saved).toEqual([]);
    },
  );
});
