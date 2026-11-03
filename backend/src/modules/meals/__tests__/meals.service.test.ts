import { describe, expect, it, vi } from 'vitest';
import { NotFoundError, ValidationError } from '../../../shared/errors';
import { logger } from '../../../shared/logger';
import { pktDayBounds } from '../../../shared/time/pkt';
import type { Dish, PortionNutrition } from '../../nutrition';
import { createMealsService } from '../meals.service';
import type { Meal, SaveMealItemInput } from '../meals.types';

const NOW = new Date('2026-11-01T19:30:00Z'); // already 2026-11-02 in PKT
const CAL: Record<string, number> = { roti: 100, daal: 150 };
const item = (patch: Partial<SaveMealItemInput> = {}): SaveMealItemInput => ({
  predictedDish: 'roti',
  predictedPortion: 2,
  confirmedDish: 'roti',
  confirmedPortion: 2,
  confidence: 0.9,
  ...patch,
});

function setup(listed: Meal[] = []) {
  const repository = {
    insertMeal: vi.fn(async () => ({ id: 'm1', eatenAt: '2026-11-01T19:30:00.000Z' })),
    insertItems: vi.fn(async () => {}),
    deleteMeal: vi.fn(async () => {}),
    listMealsBetween: vi.fn(async () => listed),
    getMeal: vi.fn(async () => listed[0] ?? null),
    replaceItems: vi.fn(async () => true),
    removeMeal: vi.fn(async () => true),
  };
  const nutrition = {
    getDish: vi.fn(async (slug: string) => ({ id: `id-${slug}`, slug }) as Dish),
    portionNutrition: vi.fn(
      async (slug: string, units: number) =>
        ({
          calories: (CAL[slug] ?? 0) * units,
        }) as PortionNutrition,
    ),
  };
  const streaks = { markMealSaved: vi.fn(async () => {}) };
  const service = createMealsService({ repository, nutrition, streaks, now: () => NOW });
  return { service, repository, nutrition, streaks };
}

describe('meals service', () => {
  it('marks once with the database time only after items save', async () => {
    const { service, repository, streaks } = setup();
    repository.insertItems.mockImplementation(async () => {
      expect(streaks.markMealSaved).not.toHaveBeenCalled();
    });
    await service.saveMeal('u1', { items: [item()] });
    expect(streaks.markMealSaved).toHaveBeenCalledExactlyOnceWith('u1', '2026-11-01T19:30:00.000Z');
  });
  it('never marks a failed item insertion', async () => {
    const { service, repository, streaks } = setup();
    repository.insertItems.mockRejectedValueOnce(new Error('items failed'));
    await expect(service.saveMeal('u1', { items: [item()] })).rejects.toThrow('items failed');
    expect(streaks.markMealSaved).not.toHaveBeenCalled();
  });
  it('returns the saved meal when marking fails so status can repair it', async () => {
    const { service, streaks } = setup();
    streaks.markMealSaved.mockRejectedValueOnce(new Error('mark unavailable'));
    await expect(service.saveMeal('u1', { items: [item()] })).resolves.toMatchObject({ id: 'm1' });
  });
  it('saves an unknown scan item as a user-added dish without looking up "unknown"', async () => {
    const { service, repository, nutrition } = setup();
    await service.saveMeal('u1', {
      items: [
        item({
          predictedDish: 'unknown',
          predictedPortion: 0,
          confirmedDish: 'roti',
          confirmedPortion: 2,
          confidence: 0,
        }),
      ],
    });
    expect(nutrition.getDish).not.toHaveBeenCalledWith('unknown');
    expect(repository.insertItems).toHaveBeenCalledWith([
      {
        meal_id: 'm1',
        predicted_dish_id: null,
        confirmed_dish_id: 'id-roti',
        predicted_portion: 0,
        confirmed_portion: 2,
        confidence: 0,
      },
    ]);
  });

  it('sums confirmed calories; a removed item adds 0 and keeps its prediction', async () => {
    const { service, repository } = setup();
    const removed = item({
      predictedDish: 'daal',
      predictedPortion: 1,
      confirmedDish: null,
      confirmedPortion: null,
    });
    const meal = await service.saveMeal('u1', { items: [item(), removed] });
    expect(meal.totalCalories).toBe(200);
    expect(meal.id).toBe('m1');
    expect(repository.insertMeal).toHaveBeenCalledWith('u1', 200);
    expect(repository.insertItems).toHaveBeenCalledWith([
      {
        meal_id: 'm1',
        predicted_dish_id: 'id-roti',
        confirmed_dish_id: 'id-roti',
        predicted_portion: 2,
        confirmed_portion: 2,
        confidence: 0.9,
      },
      {
        meal_id: 'm1',
        predicted_dish_id: 'id-daal',
        confirmed_dish_id: null,
        predicted_portion: 1,
        confirmed_portion: null,
        confidence: 0.9,
      },
    ]);
  });

  it('stores a user-added item with a null prediction', async () => {
    const { service, repository } = setup();
    await service.saveMeal('u1', {
      items: [
        item({
          predictedDish: null,
          predictedPortion: null,
          confirmedDish: 'daal',
          confirmedPortion: 1,
          confidence: null,
        }),
      ],
    });
    expect(repository.insertItems).toHaveBeenCalledWith([
      expect.objectContaining({ predicted_dish_id: null, confirmed_dish_id: 'id-daal' }),
    ]);
  });

  it('rejects a meal with no confirmed dish and writes nothing', async () => {
    const { service, repository } = setup();
    const removed = item({ confirmedDish: null, confirmedPortion: null });
    await expect(service.saveMeal('u1', { items: [removed] })).rejects.toEqual(
      new ValidationError('A meal needs at least one confirmed dish'),
    );
    expect(repository.insertMeal).not.toHaveBeenCalled();
  });

  it('deletes the meal when the items insert fails and rethrows', async () => {
    const { service, repository } = setup();
    const boom = new Error('items failed');
    repository.insertItems.mockRejectedValueOnce(boom);
    await expect(service.saveMeal('u1', { items: [item()] })).rejects.toBe(boom);
    expect(repository.deleteMeal).toHaveBeenCalledWith('u1', 'm1');
  });

  it('keeps the original error when the compensating delete also fails', async () => {
    const { service, repository } = setup();
    const boom = new Error('items failed');
    repository.insertItems.mockRejectedValueOnce(boom);
    repository.deleteMeal.mockRejectedValueOnce(new Error('delete failed'));
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    await expect(service.saveMeal('u1', { items: [item()] })).rejects.toBe(boom);
    expect(repository.deleteMeal).toHaveBeenCalledWith('u1', 'm1');
    expect(warn).toHaveBeenCalledExactlyOnceWith('Compensating meal delete failed', {
      mealId: 'm1',
    });
    warn.mockRestore();
  });

  it('rejects an unknown slug with NotFoundError before inserting anything', async () => {
    const { service, repository, nutrition } = setup();
    nutrition.getDish.mockImplementation(async (slug: string) => {
      if (slug === 'nope') throw new NotFoundError('Unknown dish: nope');
      return { id: `id-${slug}`, slug } as Dish;
    });
    await expect(
      service.saveMeal('u1', { items: [item(), item({ predictedDish: 'nope' })] }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(repository.insertMeal).not.toHaveBeenCalled();
    expect(repository.insertItems).not.toHaveBeenCalled();
  });

  it('listToday queries the PKT day bounds of now for the user and sums calories', async () => {
    const meals = [
      { id: 'a', eatenAt: 'x', totalCalories: 300, items: [] },
      { id: 'b', eatenAt: 'y', totalCalories: 450, items: [] },
    ];
    const { service, repository } = setup(meals);
    const { startIso, endIso } = pktDayBounds('2026-11-02');
    await expect(service.listToday('u1')).resolves.toEqual({
      day: '2026-11-02',
      meals,
      totalCalories: 750,
    });
    expect(repository.listMealsBetween).toHaveBeenCalledWith('u1', startIso, endIso);
    await expect(service.caloriesToday('u1')).resolves.toBe(750);
  });

  describe('week and history', () => {
    // 2026-11-02 05:00 PKT and 2026-10-30 23:30 PKT (= 18:30Z)
    const meals: Meal[] = [
      { id: 'a', eatenAt: '2026-10-30T18:30:00.000Z', totalCalories: 300, items: [] },
      { id: 'b', eatenAt: '2026-11-01T08:00:00.000Z', totalCalories: 200, items: [] },
      { id: 'c', eatenAt: '2026-11-01T14:00:00.000Z', totalCalories: 450, items: [] },
    ];

    it('weekTotals returns exactly 7 PKT days, oldest first, empty days as 0/0, one scoped query', async () => {
      const { service, repository } = setup(meals);
      const { days } = await service.weekTotals('u1');
      expect(days.map((d) => d.day)).toEqual([
        '2026-10-27',
        '2026-10-28',
        '2026-10-29',
        '2026-10-30',
        '2026-10-31',
        '2026-11-01',
        '2026-11-02',
      ]);
      // 18:30Z on the 30th is 23:30 PKT on the 30th; 14:00Z on the 1st is 19:00 PKT on the 1st.
      expect(days[3]).toEqual({ day: '2026-10-30', totalCalories: 300, mealCount: 1 });
      expect(days[5]).toEqual({ day: '2026-11-01', totalCalories: 650, mealCount: 2 });
      expect(days[6]).toEqual({ day: '2026-11-02', totalCalories: 0, mealCount: 0 });
      expect(repository.listMealsBetween).toHaveBeenCalledExactlyOnceWith(
        'u1',
        pktDayBounds('2026-10-27').startIso,
        pktDayBounds('2026-11-02').endIso,
      );
    });

    it('history groups by PKT day, newest day first, only days with meals', async () => {
      const { service, repository } = setup(meals);
      const { days } = await service.history('u1', 14);
      expect(days).toEqual([
        { day: '2026-11-01', totalCalories: 650, meals: [meals[1], meals[2]] },
        { day: '2026-10-30', totalCalories: 300, meals: [meals[0]] },
      ]);
      expect(repository.listMealsBetween).toHaveBeenCalledExactlyOnceWith(
        'u1',
        pktDayBounds('2026-10-20').startIso,
        pktDayBounds('2026-11-02').endIso,
      );
    });

    it('history defaults to 14 days', async () => {
      const { service, repository } = setup([]);
      await expect(service.history('u1')).resolves.toEqual({ days: [] });
      expect(repository.listMealsBetween).toHaveBeenCalledWith(
        'u1',
        pktDayBounds('2026-10-20').startIso,
        expect.any(String),
      );
    });
  });

  describe('get, update, delete one meal', () => {
    const stored: Meal = {
      id: 'm9',
      eatenAt: '2026-11-01T08:00:00.000Z',
      totalCalories: 1,
      items: [],
    };

    it("getMeal returns the meal, or NotFoundError when it is not the user's", async () => {
      const { service, repository } = setup([stored]);
      await expect(service.getMeal('u1', 'm9')).resolves.toBe(stored);
      expect(repository.getMeal).toHaveBeenCalledWith('u1', 'm9');
      repository.getMeal.mockResolvedValueOnce(null);
      await expect(service.getMeal('u1', 'other')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('updateMeal recomputes totals from the catalog, replaces items for the owner and returns the meal', async () => {
      const { service, repository, streaks } = setup([stored]);
      const out = await service.updateMeal('u1', 'm9', {
        items: [
          item({ confirmedPortion: 3 }),
          item({ predictedDish: 'daal', confirmedDish: 'daal', confirmedPortion: 1 }),
        ],
      });
      expect(out).toBe(stored);
      expect(repository.replaceItems).toHaveBeenCalledExactlyOnceWith('u1', 'm9', 450, [
        {
          predicted_dish_id: 'id-roti',
          confirmed_dish_id: 'id-roti',
          predicted_portion: 2,
          confirmed_portion: 3,
          confidence: 0.9,
        },
        {
          predicted_dish_id: 'id-daal',
          confirmed_dish_id: 'id-daal',
          predicted_portion: 2,
          confirmed_portion: 1,
          confidence: 0.9,
        },
      ]);
      expect(streaks.markMealSaved).not.toHaveBeenCalled();
    });

    it('updateMeal needs a confirmed dish and writes nothing otherwise', async () => {
      const { service, repository } = setup([stored]);
      await expect(
        service.updateMeal('u1', 'm9', {
          items: [item({ confirmedDish: null, confirmedPortion: null })],
        }),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(repository.replaceItems).not.toHaveBeenCalled();
    });

    it("updateMeal on a meal that is not the user's is NotFoundError", async () => {
      const { service, repository } = setup([stored]);
      repository.replaceItems.mockResolvedValueOnce(false);
      await expect(service.updateMeal('u2', 'm9', { items: [item()] })).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it("deleteMeal removes through one atomic repository call, NotFoundError when not the user's", async () => {
      const { service, repository } = setup();
      await expect(service.deleteMeal('u1', 'm9')).resolves.toBeUndefined();
      expect(repository.removeMeal).toHaveBeenCalledExactlyOnceWith('u1', 'm9');
      repository.removeMeal.mockResolvedValueOnce(false);
      await expect(service.deleteMeal('u2', 'm9')).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
