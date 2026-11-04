import { describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '../../../shared/errors';
import { createProfilesService } from '../profiles.service';
import type { ProfileInput, ProfileRow, ProfileUpsertRow } from '../profiles.types';

const input: ProfileInput = {
  displayName: 'Ayesha',
  goal: 'maintain',
  sex: 'female',
  age: 25,
  heightCm: 160,
  weightKg: 60,
  activityLevel: 'sedentary',
};

const row: ProfileUpsertRow = {
  id: 'u1',
  display_name: 'Ayesha',
  goal: 'maintain',
  sex: 'female',
  age: 25,
  height_cm: 160,
  weight_kg: 60,
  activity_level: 'sedentary',
  daily_calorie_budget: 1577,
};

function setup(found: ProfileRow | null = null) {
  const repository = {
    upsertProfile: vi.fn(async (r: ProfileUpsertRow) => ({ ...r, username: null })),
    findProfile: vi.fn(async (_userId: string) => found),
    setUsername: vi.fn(async () => true),
    searchUsernames: vi.fn(async () => []),
    findCards: vi.fn(async () => []),
  };
  return { repository, service: createProfilesService({ repository }) };
}

describe('profiles service', () => {
  it('upsertProfile stores the computed budget under the given userId and returns a camelCase Profile', async () => {
    const { repository, service } = setup();
    const profile = await service.upsertProfile('u1', input);
    expect(repository.upsertProfile).toHaveBeenCalledWith(row);
    expect(profile).toEqual({
      id: 'u1',
      username: null,
      displayName: 'Ayesha',
      goal: 'maintain',
      sex: 'female',
      age: 25,
      heightCm: 160,
      weightKg: 60,
      activityLevel: 'sedentary',
      dailyCalorieBudget: 1577,
    });
  });

  it('ignores a client-supplied budget', async () => {
    const { repository, service } = setup();
    const profile = await service.upsertProfile('u1', {
      ...input,
      dailyCalorieBudget: 9999,
    } as ProfileInput);
    expect(repository.upsertProfile).toHaveBeenCalledWith(row);
    expect(profile.dailyCalorieBudget).toBe(1577);
  });

  it('stores a null displayName when none is given', async () => {
    const { repository, service } = setup();
    await service.upsertProfile('u1', { ...input, displayName: undefined });
    expect(repository.upsertProfile).toHaveBeenCalledWith({ ...row, display_name: null });
  });

  it('getProfile returns the stored profile scoped to userId', async () => {
    const { repository, service } = setup({ ...row, username: null });
    expect((await service.getProfile('u1')).dailyCalorieBudget).toBe(1577);
    expect(repository.findProfile).toHaveBeenCalledWith('u1');
  });

  it('getProfile rejects with NotFoundError when there is no profile', async () => {
    await expect(setup().service.getProfile('u1')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('getDailyBudget returns the stored budget', async () => {
    expect(await setup({ ...row, username: null }).service.getDailyBudget('u1')).toBe(1577);
  });

  it('getDailyBudget rejects with "Set up your profile first" when profile or budget is missing', async () => {
    const msg = 'Set up your profile first';
    await expect(setup().service.getDailyBudget('u1')).rejects.toThrow(msg);
    await expect(setup().service.getDailyBudget('u1')).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      setup({ ...row, username: null, daily_calorie_budget: null }).service.getDailyBudget('u1'),
    ).rejects.toThrow(msg);
  });
});
