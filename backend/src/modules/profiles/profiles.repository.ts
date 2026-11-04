import type { Db } from '../../shared/db';
import type { AvoidListRow, AvoidRow, ProfileRow } from './profiles.types';

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
