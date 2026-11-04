import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors';
import { computeDailyBudget } from './budget';
import type { ProfilesRepository } from './profiles.repository';
import { usernameSchema } from './profiles.schemas';
import type {
  Avoids,
  CardRow,
  PersonCard,
  Profile,
  ProfileInput,
  ProfileRow,
} from './profiles.types';

interface ProfilesDeps {
  repository: ProfilesRepository;
}

const toProfile = (r: ProfileRow, dailyCalorieBudget: number): Profile => ({
  id: r.id,
  username: r.username,
  displayName: r.display_name,
  goal: r.goal,
  sex: r.sex,
  age: r.age,
  heightCm: r.height_cm,
  weightKg: r.weight_kg,
  activityLevel: r.activity_level,
  dailyCalorieBudget,
});

const toCard = (r: CardRow): PersonCard => ({
  userId: r.id,
  username: r.username,
  displayName: r.display_name,
});

// Business rules for profiles.
export function createProfilesService({ repository }: ProfilesDeps) {
  async function getProfile(userId: string): Promise<Profile> {
    const row = await repository.findProfile(userId);
    if (!row || row.daily_calorie_budget === null)
      throw new NotFoundError('Set up your profile first');
    return toProfile(row, row.daily_calorie_budget);
  }

  return {
    getProfile,

    async upsertProfile(userId: string, input: ProfileInput): Promise<Profile> {
      const budget = computeDailyBudget(input);
      const saved = await repository.upsertProfile({
        id: userId,
        display_name: input.displayName ?? null,
        goal: input.goal,
        sex: input.sex,
        age: input.age,
        height_cm: input.heightCm,
        weight_kg: input.weightKg,
        activity_level: input.activityLevel,
        daily_calorie_budget: budget,
      });
      return toProfile(saved, budget);
    },

    async setUsername(userId: string, username: string): Promise<void> {
      const parsed = usernameSchema.safeParse(username);
      if (!parsed.success)
        throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid username');
      try {
        if (!(await repository.setUsername(userId, parsed.data)))
          throw new NotFoundError('Set up your profile first');
      } catch (e) {
        // 23505: unique violation, also covers two users claiming the same name at once.
        if ((e as { code?: string }).code === '23505') throw new ConflictError('Username taken');
        throw e;
      }
    },

    async searchUsernames(prefix: string, limit: number): Promise<PersonCard[]> {
      const p = prefix.toLowerCase();
      // Usernames hold only [a-z0-9_]; anything else (e.g. PostgREST's `*` wildcard) cannot match, so skip the query.
      if (!/^[a-z0-9_]+$/.test(p)) return [];
      return (await repository.searchUsernames(p, limit)).map(toCard);
    },

    async getCards(userIds: string[]): Promise<PersonCard[]> {
      return userIds.length ? (await repository.findCards(userIds)).map(toCard) : [];
    },

    async getAvoids(userId: string): Promise<Avoids> {
      const rows = await repository.listAvoids(userId);
      return {
        proteins: rows.flatMap((r) => (r.protein ? [r.protein] : [])).sort(),
        dishes: rows.flatMap((r) => (r.dishes ? [r.dishes.slug] : [])).sort(),
      };
    },

    async replaceAvoids(userId: string, input: Avoids): Promise<Avoids> {
      const proteins = [...new Set(input.proteins)].sort();
      const dishes = [...new Set(input.dishes)].sort();
      const ids = await repository.dishIdsBySlug(dishes);
      const dishRows = dishes.map((slug) => {
        const id = ids.get(slug);
        if (!id) throw new ValidationError(`Unknown dish: ${slug}`);
        return { kind: 'dish' as const, protein: null, dish_id: id };
      });
      await repository.replaceAvoids(userId, [
        ...proteins.map((p) => ({ kind: 'protein' as const, protein: p, dish_id: null })),
        ...dishRows,
      ]);
      return { proteins, dishes };
    },

    async getDailyBudget(userId: string): Promise<number> {
      return (await getProfile(userId)).dailyCalorieBudget;
    },
  };
}

export type ProfilesService = ReturnType<typeof createProfilesService>;
