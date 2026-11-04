import type { Db } from '../../shared/db';
import type { CardRow, ProfileRow, ProfileUpsertRow } from './profiles.types';

const COLUMNS =
  'id, username, display_name, goal, sex, age, height_cm, weight_kg, activity_level, daily_calorie_budget';
const CARD_COLUMNS = 'id, username, display_name';

// Supabase data access for profiles. No business rules here.
export function createProfilesRepository(db: Db) {
  return {
    async upsertProfile(row: ProfileUpsertRow): Promise<ProfileRow> {
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

    // Returns false when the user has no profile row yet.
    async setUsername(userId: string, username: string): Promise<boolean> {
      const { data, error } = await db
        .from('profiles')
        .update({ username })
        .eq('id', userId)
        .select('id');
      if (error) throw error;
      return data.length > 0;
    },

    async searchUsernames(prefix: string, limit: number): Promise<CardRow[]> {
      const { data, error } = await db
        .from('profiles')
        .select(CARD_COLUMNS)
        .ilike('username', `${prefix.replace(/[\\%_]/g, '\\$&')}%`)
        .order('username')
        .limit(limit);
      if (error) throw error;
      return data as CardRow[];
    },

    async findCards(userIds: string[]): Promise<CardRow[]> {
      const { data, error } = await db.from('profiles').select(CARD_COLUMNS).in('id', userIds);
      if (error) throw error;
      return data as CardRow[];
    },
  };
}

export type ProfilesRepository = ReturnType<typeof createProfilesRepository>;
