import { describe, expect, it, vi } from 'vitest';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors';
import { createFeelService } from '../feel.service';
import type { FeelRepository } from '../feel.repository';
import type { ExperimentRow, Observation } from '../feel.types';

const NOW = new Date('2026-11-03T10:00:00Z'); // 15:00 PKT; window 2026-10-28..2026-11-03
const HOUR = 3_600_000;
const KEY = 'category:rice:heavy';
let seq = 0;
function obs(userId: string, o: Partial<Observation> = {}): Observation {
  seq += 1;
  const eaten = new Date(NOW.getTime() - (seq + 1) * 2 * HOUR);
  return {
    userId,
    mealId: `m${seq}`,
    eatenAt: eaten.toISOString(),
    checkedInAt: new Date(eaten.getTime() + 2 * HOUR).toISOString(),
    dishes: [{ slug: 'biryani', category: 'rice' }],
    energy: 'okay',
    stomach: 'heavy',
    symptom: null,
    answerId: null,
    ...o,
  };
}

// In-memory stand-in for the repository, scoped by user exactly as the real one must be.
function setup({
  observations = [] as Observation[],
  meals = {} as Record<string, { userId: string; savedAt: string }>,
  checkins = {} as Record<
    string,
    { energy: 'low' | 'okay' | 'good'; stomach: 'heavy' | 'fine' | 'light' }
  >,
  experiments = [] as (ExperimentRow & { userId: string })[],
} = {}) {
  const store = [...experiments];
  const repository = {
    listObservations: vi.fn(async (userId: string) =>
      observations.filter((o) => o.userId === userId),
    ),
    findCurrentExperiment: vi.fn(async (userId: string) => {
      const mine = store.filter((e) => e.userId === userId);
      return mine.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0] ?? null;
    }),
    findExperiment: vi.fn(
      async (userId: string, id: string) =>
        store.find((e) => e.userId === userId && e.id === id) ?? null,
    ),
    insertExperiment: vi.fn(
      async (userId: string, patternKey: string, action: ExperimentRow['action']) => {
        if (store.some((e) => e.userId === userId && e.status === 'active'))
          throw Object.assign(new Error('dup'), { code: '23505' });
        const row = {
          userId,
          id: `exp${store.length + 1}`,
          patternKey,
          action,
          status: 'active' as const,
          createdAt: NOW.toISOString(),
          triedAt: null,
          triedMealId: null,
        };
        store.push(row);
        return row;
      },
    ),
    markExperimentTried: vi.fn(
      async (userId: string, id: string, mealId: string, triedAt: string) => {
        const row = store.find((e) => e.userId === userId && e.id === id && e.status === 'active');
        if (!row) return null;
        Object.assign(row, { status: 'tried', triedAt, triedMealId: mealId });
        return row;
      },
    ),
    findMealSavedAt: vi.fn(async (userId: string, mealId: string) =>
      meals[mealId]?.userId === userId ? meals[mealId].savedAt : null,
    ),
    findCheckinFeeling: vi.fn(async (userId: string, mealId: string) =>
      meals[mealId]?.userId === userId ? (checkins[mealId] ?? null) : null,
    ),
  };
  const service = createFeelService({
    repository: repository as unknown as FeelRepository,
    questionClient: { draft: async () => ({ text: '', optionIds: [] }) },
  });
  return { service, repository, store };
}
const sevenRice = (userId: string) => Array.from({ length: 7 }, () => obs(userId));
const active = (userId: string, over: Partial<ExperimentRow> = {}) => ({
  userId,
  id: 'exp1',
  patternKey: KEY,
  action: 'smaller_portion' as const,
  status: 'active' as const,
  createdAt: '2026-11-03T08:00:00.000Z',
  triedAt: null,
  triedMealId: null,
  ...over,
});

describe('createExperiment', () => {
  it('saves the chosen action for the key of the caller’s own current card', async () => {
    const { service, repository } = setup({ observations: sevenRice('owner') });
    const experiment = await service.createExperiment('owner', KEY, 'smaller_portion', NOW);
    expect(repository.insertExperiment).toHaveBeenCalledWith('owner', KEY, 'smaller_portion');
    expect(experiment).toEqual({
      id: 'exp1',
      patternKey: KEY,
      action: 'smaller_portion',
      status: 'active',
      createdAt: NOW.toISOString(),
      triedAt: null,
      tried: null,
    });
    expect(JSON.stringify(experiment)).not.toContain('userId');
  });

  it('refuses a key that only another user’s evidence produces', async () => {
    const theirs = Array.from({ length: 7 }, () =>
      obs('other', { dishes: [{ slug: 'naan', category: 'roti' }] }),
    );
    const { service, repository } = setup({ observations: [...sevenRice('owner'), ...theirs] });
    await expect(
      service.createExperiment('owner', 'category:roti:heavy', 'observe_again', NOW),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repository.insertExperiment).not.toHaveBeenCalled();
  });

  it('refuses any key when the caller has no pattern', async () => {
    const { service } = setup({ observations: sevenRice('other') });
    await expect(
      service.createExperiment('owner', KEY, 'smaller_portion', NOW),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('refuses a second experiment while one is active', async () => {
    const { service, repository } = setup({
      observations: sevenRice('owner'),
      experiments: [active('owner')],
    });
    await expect(
      service.createExperiment('owner', KEY, 'observe_again', NOW),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(repository.insertExperiment).not.toHaveBeenCalled();
  });

  it('maps a lost race on the one-active index to a conflict', async () => {
    const { service, repository } = setup({ observations: sevenRice('owner') });
    repository.findCurrentExperiment.mockResolvedValueOnce(null);
    repository.insertExperiment.mockRejectedValueOnce(
      Object.assign(new Error('dup'), { code: '23505' }),
    );
    await expect(
      service.createExperiment('owner', KEY, 'observe_again', NOW),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('allows a new experiment once the previous one is tried', async () => {
    const { service } = setup({
      observations: sevenRice('owner'),
      experiments: [
        active('owner', { status: 'tried', triedAt: NOW.toISOString(), triedMealId: 'm1' }),
      ],
    });
    await expect(
      service.createExperiment('owner', KEY, 'different_side', NOW),
    ).resolves.toMatchObject({
      action: 'different_side',
    });
  });
});

describe('getCurrentExperiment', () => {
  it('is null for a user with none, and ignores other users’ experiments', async () => {
    const { service } = setup({ experiments: [active('other')] });
    expect(await service.getCurrentExperiment('owner')).toBeNull();
  });

  it('returns the newest experiment', async () => {
    const { service } = setup({
      experiments: [
        active('owner', {
          id: 'old',
          status: 'tried',
          triedAt: 'x',
          createdAt: '2026-11-01T00:00:00.000Z',
          triedMealId: null,
        }),
        active('owner', { id: 'new' }),
      ],
    });
    expect(await service.getCurrentExperiment('owner')).toMatchObject({
      id: 'new',
      status: 'active',
      tried: null,
    });
  });

  it('shows the feeling from the caller’s own check-in of the tried meal, else null', async () => {
    const tried = active('owner', {
      status: 'tried',
      triedAt: NOW.toISOString(),
      triedMealId: 'mt',
    });
    const withCheckin = setup({
      experiments: [tried],
      meals: { mt: { userId: 'owner', savedAt: NOW.toISOString() } },
      checkins: { mt: { energy: 'good', stomach: 'light' } },
    });
    expect((await withCheckin.service.getCurrentExperiment('owner'))?.tried).toEqual({
      mealId: 'mt',
      energy: 'good',
      stomach: 'light',
    });
    const without = setup({ experiments: [tried] });
    expect((await without.service.getCurrentExperiment('owner'))?.tried).toEqual({
      mealId: 'mt',
      energy: null,
      stomach: null,
    });
  });
});

describe('markExperimentTried', () => {
  const later = { userId: 'owner', savedAt: '2026-11-03T09:00:00.000Z' };
  it('marks the experiment tried with a later meal of the owner', async () => {
    const { service, repository } = setup({
      experiments: [active('owner')],
      meals: { mine: later },
    });
    const experiment = await service.markExperimentTried('owner', 'exp1', 'mine', NOW);
    expect(repository.markExperimentTried).toHaveBeenCalledWith(
      'owner',
      'exp1',
      'mine',
      NOW.toISOString(),
    );
    expect(experiment).toMatchObject({
      status: 'tried',
      triedAt: NOW.toISOString(),
      tried: { mealId: 'mine' },
    });
  });

  it('returns 404 for another user’s experiment and never touches it', async () => {
    const { service, store } = setup({ experiments: [active('other')], meals: { mine: later } });
    await expect(service.markExperimentTried('owner', 'exp1', 'mine', NOW)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(store[0]?.status).toBe('active');
  });

  it('refuses another user’s meal', async () => {
    const { service, store } = setup({
      experiments: [active('owner')],
      meals: { theirs: { userId: 'other', savedAt: later.savedAt } },
    });
    await expect(
      service.markExperimentTried('owner', 'exp1', 'theirs', NOW),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(store[0]?.status).toBe('active');
  });

  it('refuses a meal that does not exist', async () => {
    const { service } = setup({ experiments: [active('owner')] });
    await expect(service.markExperimentTried('owner', 'exp1', 'nope', NOW)).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it.each(['2026-11-03T07:59:59.000Z', '2026-11-03T08:00:00.000Z'])(
    'refuses a meal saved at %s, not after the experiment was created',
    async (savedAt) => {
      const { service, store } = setup({
        experiments: [active('owner')],
        meals: { mine: { userId: 'owner', savedAt } },
      });
      await expect(
        service.markExperimentTried('owner', 'exp1', 'mine', NOW),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(store[0]?.status).toBe('active');
    },
  );

  it('answers 409 when it was already tried and leaves it unchanged', async () => {
    const tried = active('owner', { status: 'tried', triedAt: 'before', triedMealId: 'first' });
    const { service, store } = setup({ experiments: [tried], meals: { mine: later } });
    await expect(service.markExperimentTried('owner', 'exp1', 'mine', NOW)).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(store[0]).toMatchObject({ triedAt: 'before', triedMealId: 'first' });
  });

  it('answers 409 when another request marked it between the read and the write', async () => {
    const { service, repository } = setup({
      experiments: [active('owner')],
      meals: { mine: later },
    });
    repository.markExperimentTried.mockResolvedValueOnce(null);
    await expect(service.markExperimentTried('owner', 'exp1', 'mine', NOW)).rejects.toBeInstanceOf(
      ConflictError,
    );
  });
});
