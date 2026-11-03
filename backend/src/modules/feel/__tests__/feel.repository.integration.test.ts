import { createHmac, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { createFeelRepository } from '../feel.repository';
import { createFeelService } from '../feel.service';

// Only the disposable local PostgREST fixture documented in the task report.
const enabled = process.env.FEEL_LOCAL_DB_TEST === '1';
const payload = [
  Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
  Buffer.from(JSON.stringify({ role: 'postgres' })).toString('base64url'),
].join('.');
const token = `${payload}.${createHmac('sha256', 'feel-test-only-secret-at-least-thirty-two-chars').update(payload).digest('base64url')}`;
const db = createClient('http://127.0.0.1:54325', token, {
  auth: { persistSession: false },
  // Standalone PostgREST has no Supabase gateway's /rest/v1 prefix.
  global: { fetch: (url, init) => fetch(String(url).replace('/rest/v1', ''), init) },
});
const noDraft = {
  draft: async (): Promise<never> => {
    throw new Error('not used');
  },
};
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';

// SQL is external and slow, so this opt-in test exercises the real repository
// against Postgres + PostgREST, without a fake Supabase query builder.
describe.skipIf(!enabled)('feel disposable database integration', () => {
  it('uses confirmed dishes, real clock boundaries, owner isolation, and one response under concurrency', async () => {
    const repository = createFeelRepository(db);
    const service = createFeelService({ repository, questionClient: noDraft });
    const mealId = randomUUID();
    const dishId = randomUUID();
    const predictedId = randomUUID();
    const eatenAt = '2026-11-02T10:30:00.000Z';
    try {
      for (const [id, name] of [
        [dishId, 'Raita'],
        [predictedId, 'Predicted only'],
      ]) {
        const { error } = await db.from('dishes').insert({
          id,
          slug: id,
          name,
          category: 'other',
          unit: 'katori',
          grams_per_unit: 100,
          local_calories: 100,
        });
        expect(error).toBeNull();
      }
      expect(
        (await db.from('meals').insert({ id: mealId, user_id: owner, eaten_at: eatenAt })).error,
      ).toBeNull();
      expect(
        (
          await db.from('meal_items').insert([
            { meal_id: mealId, predicted_dish_id: predictedId, confirmed_dish_id: dishId },
            { meal_id: mealId, predicted_dish_id: predictedId, confirmed_dish_id: null },
          ])
        ).error,
      ).toBeNull();
      expect(await service.getDue(owner, new Date('2026-11-02T11:59:00Z'))).toBeNull();
      expect(await service.getDue(owner, new Date('2026-11-02T12:00:00Z'))).toEqual({
        mealId,
        eatenAt: '2026-11-02T10:30:00+00:00',
        dishes: ['Raita'],
      });
      expect(await service.getDue(owner, new Date('2026-11-03T10:30:00Z'))).not.toBeNull();
      expect(await service.getDue(owner, new Date('2026-11-03T10:30:01Z'))).toBeNull();
      expect(await service.getDue(other, new Date('2026-11-02T12:00:00Z'))).toBeNull();
      await expect(
        service.submitCheckin(
          other,
          { mealId, energy: 'okay', stomach: 'fine' },
          new Date('2026-11-02T12:00:00Z'),
        ),
      ).rejects.toMatchObject({ status: 404 });
      // The DB itself prevents a service-role caller from attaching another owner.
      expect(
        (
          await db
            .from('feel_checkins')
            .insert({ user_id: other, meal_id: mealId, energy: 'okay', stomach: 'fine' })
        ).error?.code,
      ).toBe('23503');
      expect(
        (
          await db.from('feel_checkins').insert({
            user_id: owner,
            meal_id: mealId,
            energy: 'okay',
            stomach: 'fine',
            symptom: 'invalid',
          })
        ).error?.code,
      ).toBe('23514');
      const responses = await Promise.allSettled(
        [1, 2].map(() =>
          service.submitCheckin(
            owner,
            { mealId, energy: 'okay', stomach: 'fine' },
            new Date('2026-11-02T12:00:00Z'),
          ),
        ),
      );
      expect(responses.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(responses.find((r) => r.status === 'rejected')).toMatchObject({
        reason: { status: 400 },
      });
      const { data, error } = await db
        .from('feel_checkins')
        .select('energy, stomach, symptom, question_type, answer_id, question_source')
        .eq('meal_id', mealId)
        .eq('user_id', owner);
      expect(error).toBeNull();
      expect(data).toEqual([
        {
          energy: 'okay',
          stomach: 'fine',
          symptom: null,
          question_type: null,
          answer_id: null,
          question_source: null,
        },
      ]);
      expect(await service.getDue(owner, new Date('2026-11-02T12:00:00Z'))).toBeNull();
      // Evidence history: owner-only, confirmed dishes, with the check-in time (the service applies the 24 h rule).
      const observed = async (user: string) =>
        (await repository.listObservations(user)).filter((o) => o.mealId === mealId);
      const setCheckinTime = async (at: string) =>
        expect(
          (await db.from('feel_checkins').update({ created_at: at }).eq('meal_id', mealId)).error,
        ).toBeNull();
      await setCheckinTime('2026-11-03T10:30:00Z');
      expect(await observed(owner)).toEqual([
        {
          userId: owner,
          mealId,
          eatenAt: '2026-11-02T10:30:00+00:00',
          checkedInAt: '2026-11-03T10:30:00+00:00',
          dishes: [{ slug: dishId, category: 'other' }],
          energy: 'okay',
          stomach: 'fine',
          symptom: null,
          answerId: null,
        },
      ]);
      expect(await observed(other)).toEqual([]);
    } finally {
      await db.from('meals').delete().eq('id', mealId).eq('user_id', owner);
      await db.from('dishes').delete().in('id', [dishId, predictedId]);
    }
  });
});
