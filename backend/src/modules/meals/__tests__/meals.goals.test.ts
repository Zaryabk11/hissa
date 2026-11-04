import { describe, expect, it, vi } from 'vitest';
import { logger } from '../../../shared/logger';
import type { Dish, PortionNutrition } from '../../nutrition';
import { createMealsService } from '../meals.service';

function setup() {
  const repository = {
    insertMeal: vi.fn(async () => ({ id: 'm1', eatenAt: '2026-11-01T19:30:00.000Z' })),
    insertItems: vi.fn(async () => {}),
    deleteMeal: vi.fn(async () => {}),
    listMealsBetween: vi.fn(async () => []),
    getMeal: vi.fn(async () => null),
    replaceItems: vi.fn(async () => true),
    removeMeal: vi.fn(async () => true),
  };
  const nutrition = {
    getDish: vi.fn(async (slug: string) => ({ id: `id-${slug}`, slug }) as Dish),
    portionNutrition: vi.fn(async () => ({ calories: 100 }) as PortionNutrition),
  };
  const streaks = { markMealSaved: vi.fn(async () => {}) };
  const goals = { onMealSaved: vi.fn(async () => {}) };
  const service = createMealsService({ repository, nutrition, streaks, goals });
  return { service, streaks, goals };
}

const input = {
  items: [
    {
      predictedDish: 'roti',
      predictedPortion: 2,
      confirmedDish: 'roti',
      confirmedPortion: 2,
      confidence: 0.9,
    },
  ],
};

describe('meals service goal hook', () => {
  it('checks goals for the user after the streak mark', async () => {
    const { service, streaks, goals } = setup();
    goals.onMealSaved.mockImplementation(async () => {
      expect(streaks.markMealSaved).toHaveBeenCalled();
    });
    await service.saveMeal('u1', input);
    expect(goals.onMealSaved).toHaveBeenCalledExactlyOnceWith('u1');
  });
  it('still returns the saved meal and logs when the goal check throws', async () => {
    const { service, goals } = setup();
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    goals.onMealSaved.mockRejectedValueOnce(new Error('goals down'));
    await expect(service.saveMeal('u1', input)).resolves.toMatchObject({ id: 'm1' });
    expect(warn).toHaveBeenCalledWith('Goal check failed', { mealId: 'm1' });
    warn.mockRestore();
  });
});
