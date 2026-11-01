import type { Db } from '../../shared/db';
import type { ProfileRow } from './profiles.types';

const COLUMNS =
  'id, display_name, goal, sex, age, height_cm, weight_kg, activity_level, daily_calorie_budget';

// Supabase data access for profiles. No business rules here.
export function createProfilesRepository(db: Db) {
  return {
    async upsertProfile(row: ProfileRow): Promise<ProfileRow> {
      const { data, error } = await db
        .from('profiles')
        .upsert(row, { onConflict: 'id' })
        .select(COLUMNS)
        .single();
      if (error) throw error;
      return data as ProfileRow;
    },

    async findProfile(userId: string): Promise<ProfileRow | null> {
      const { data, error } = await db
        .from('profiles')
        .select(COLUMNS)
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      return data as ProfileRow | null;
    },
  };
}

export type ProfilesRepository = ReturnType<typeof createProfilesRepository>;
