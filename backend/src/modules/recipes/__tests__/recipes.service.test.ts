import { describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '../../../shared/errors';
import { createRecipesService } from '../recipes.service';
import type { RecipeRow } from '../recipes.types';
import { dish, row } from './fixtures';

function setup(patch: { rows?: RecipeRow[]; rejected?: string[]; pattern?: unknown } = {}) {
  const repository = {
    listReviewed: vi.fn(async () => patch.rows ?? []),
    findReviewed: vi.fn(async (id: string) => (patch.rows ?? []).find((r) => r.id === id) ?? null),
    listNotForMe: vi.fn(async () => patch.rejected ?? []),
    addNotForMe: vi.fn(async () => {}),
    removeNotForMe: vi.fn(async () => {}),
  };
  const profiles = {
    getAvoids: vi.fn(async () => ({ proteins: [], dishes: [] })),
    getDailyBudget: vi.fn(async () => 1800),
  };
  const meals = { caloriesToday: vi.fn(async () => 0), dishCounts: vi.fn(async () => ({})) };
  const feel = {
    getWeeklyPattern: vi.fn(
      async () => patch.pattern ?? { state: 'insufficient_data', pattern: null },
    ),
  };
  const nutrition = {
    listCatalog: vi.fn(async () => [
      dish('daal'),
      dish('raita', { category: 'side' }),
      dish('beef-pulao', { category: 'rice', proteinType: 'beef', kcalPer100g: 200 }),
    ]),
  };
  const service = createRecipesService({
    repository,
    profiles,
    meals,
    feel,
    nutrition,
  } as unknown as Parameters<typeof createRecipesService>[0]);
  return { service, repository, profiles, meals, feel };
}

describe('recipes service', () => {
  it('empty profile: no avoids, no meals, no pattern still lists', async () => {
    const { service } = setup({ rows: [row('r1', 'daal'), row('r2', 'raita')] });
    const out = await service.list('u1');
    expect(out.recipes.map((r) => r.id)).toEqual(['r1', 'r2']);
    expect(out).toMatchObject({ remainingCalories: 1800, isEstimate: true });
    expect(out.recipes[0]).toMatchObject({ dish: 'daal', kcalPerUnit: 150, isEstimate: true });
  });
  it('only reviewed recipes: asks the repository for reviewed rows only', async () => {
    const { service, repository } = setup({ rows: [row('r1', 'daal')] });
    await service.detail('u1', 'r1');
    await expect(service.detail('u1', 'missing')).rejects.toBeInstanceOf(NotFoundError);
    expect(repository.findReviewed).toHaveBeenCalledWith('missing');
    await service.list('u1');
    expect(repository.listReviewed).toHaveBeenCalledOnce();
  });
  it('remaining is budget minus eaten, and a heavy pattern demotes the dish', async () => {
    const { service, meals } = setup({
      rows: [row('r1', 'daal'), row('r2', 'raita')],
      pattern: { state: 'pattern', pattern: { kind: 'dish', subject: 'daal', outcome: 'heavy' } },
    });
    meals.caloriesToday.mockResolvedValue(1000);
    const out = await service.list('u1');
    expect(out.remainingCalories).toBe(800);
    expect(out.recipes.map((r) => r.id)).toEqual(['r2', 'r1']);
  });
  it('a good-energy pattern does not demote', async () => {
    const { service } = setup({
      rows: [row('r1', 'daal'), row('r2', 'raita')],
      pattern: {
        state: 'pattern',
        pattern: { kind: 'dish', subject: 'daal', outcome: 'good_energy' },
      },
    });
    expect((await service.list('u1')).recipes.map((r) => r.id)).toEqual(['r1', 'r2']);
  });
  it('profile not set up propagates the 404', async () => {
    const { service, profiles } = setup();
    profiles.getDailyBudget.mockRejectedValue(new NotFoundError('Set up your profile first'));
    await expect(service.list('u1')).rejects.toThrow('Set up your profile first');
  });
  it('detail flags avoided and not-for-me', async () => {
    const { service, profiles } = setup({ rows: [row('r1', 'beef-pulao')], rejected: ['r1'] });
    profiles.getAvoids.mockResolvedValue({ proteins: ['beef'] as never, dishes: [] });
    const d = await service.detail('u1', 'r1');
    expect(d).toMatchObject({ avoided: true, notForMe: true, steps: ['Cook.'] });
  });
  it('markNotForMe 404s for an unserved recipe and writes nothing', async () => {
    const { service, repository } = setup();
    await expect(service.markNotForMe('u1', 'nope')).rejects.toBeInstanceOf(NotFoundError);
    expect(repository.addNotForMe).not.toHaveBeenCalled();
  });
});
