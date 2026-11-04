import { describe, expect, it, vi } from 'vitest';
import { ValidationError } from '../../../shared/errors';
import { isAvoided } from '../avoids';
import type { ProfilesRepository } from '../profiles.repository';
import { createProfilesService } from '../profiles.service';

describe('isAvoided', () => {
  const avoids = { proteins: ['beef' as const], dishes: ['haleem'] };
  it('matches dish slug', () => {
    expect(isAvoided(avoids, { slug: 'haleem', proteinType: null })).toBe(true);
  });
  it('matches protein', () => {
    expect(isAvoided(avoids, { slug: 'nihari', proteinType: 'beef' })).toBe(true);
  });
  it('null protein never matches a protein avoid', () => {
    expect(isAvoided(avoids, { slug: 'roti', proteinType: null })).toBe(false);
  });
});

function setup(
  listed: {
    kind: 'dish' | 'protein';
    protein: string | null;
    dishes: { slug: string } | null;
  }[] = [],
) {
  const repository = {
    listAvoids: vi.fn(async () => listed),
    dishIdsBySlug: vi.fn(
      async (slugs: string[]) =>
        new Map(slugs.filter((s) => s !== 'nope').map((s) => [s, `id-${s}`])),
    ),
    replaceAvoids: vi.fn(async () => undefined),
  };
  return {
    repository,
    service: createProfilesService({ repository: repository as unknown as ProfilesRepository }),
  };
}

describe('profiles avoids', () => {
  it('empty profile returns empty lists', async () => {
    expect(await setup().service.getAvoids('u1')).toEqual({ proteins: [], dishes: [] });
  });
  it('rejects unknown slug', async () => {
    const { service, repository } = setup();
    await expect(service.replaceAvoids('u1', { proteins: [], dishes: ['nope'] })).rejects.toThrow(
      ValidationError,
    );
    await expect(service.replaceAvoids('u1', { proteins: [], dishes: ['nope'] })).rejects.toThrow(
      'nope',
    );
    expect(repository.replaceAvoids).not.toHaveBeenCalled();
  });
  it('dedupes and sorts', async () => {
    const { service, repository } = setup();
    const out = await service.replaceAvoids('u1', {
      proteins: ['fish', 'beef', 'fish'],
      dishes: ['b', 'a', 'b'],
    });
    expect(out).toEqual({ proteins: ['beef', 'fish'], dishes: ['a', 'b'] });
    expect(repository.replaceAvoids).toHaveBeenCalledWith('u1', [
      { kind: 'protein', protein: 'beef', dish_id: null },
      { kind: 'protein', protein: 'fish', dish_id: null },
      { kind: 'dish', protein: null, dish_id: 'id-a' },
      { kind: 'dish', protein: null, dish_id: 'id-b' },
    ]);
  });
});
