import type { Db } from '../../shared/db';
import type {
  AvoidListRow,
  AvoidRow,
  CardRow,
  ProfileRow,
  ProfileUpsertRow,
} from './profiles.types';

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

    async listAvoids(userId: string): Promise<AvoidListRow[]> {
      const { data, error } = await db
        .from('user_avoids')
        .select('kind, protein, dishes(slug)')
        .eq('user_id', userId);
      if (error) throw error;
      return data as unknown as AvoidListRow[];
    },

    async dishIdsBySlug(slugs: string[]): Promise<Map<string, string>> {
      if (slugs.length === 0) return new Map();
      const { data, error } = await db.from('dishes').select('id, slug').in('slug', slugs);
      if (error) throw error;
      return new Map((data as { id: string; slug: string }[]).map((d) => [d.slug, d.id]));
    },

    async replaceAvoids(userId: string, rows: AvoidRow[]): Promise<void> {
      const del = await db.from('user_avoids').delete().eq('user_id', userId);
      if (del.error) throw del.error;
      if (rows.length === 0) return;
      const ins = await db.from('user_avoids').insert(rows.map((r) => ({ ...r, user_id: userId })));
      if (ins.error) throw ins.error;
    },
  };
}

export type ProfilesRepository = ReturnType<typeof createProfilesRepository>;
