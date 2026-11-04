import type { ProteinType } from '../nutrition';

export type Goal = 'lose' | 'maintain';
export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active';

export interface ProfileInput {
  displayName?: string | undefined;
  goal: Goal;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  proteinTargetG?: number | null | undefined; // undefined: leave stored target as is; null: clear
  carbsTargetG?: number | null | undefined;
  fatTargetG?: number | null | undefined;
}

export interface Profile {
  id: string;
  username: string | null;
  displayName: string | null;
  goal: Goal;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  dailyCalorieBudget: number;
  proteinTargetG: number | null;
  carbsTargetG: number | null;
  fatTargetG: number | null;
}

// A row of public.profiles as the repository reads and writes it.
export interface ProfileRow {
  id: string;
  username: string | null;
  display_name: string | null;
  goal: Goal;
  sex: Sex;
  age: number;
  height_cm: number;
  weight_kg: number;
  activity_level: ActivityLevel;
  daily_calorie_budget: number | null;
  protein_target_g: number | null;
  carbs_target_g: number | null;
  fat_target_g: number | null;
}

export type CardRow = Pick<ProfileRow, 'id' | 'username' | 'display_name'>;

// Macro targets are optional: an absent key leaves the stored value untouched on upsert.
export type ProfileUpsertRow = Omit<
  ProfileRow,
  'username' | 'protein_target_g' | 'carbs_target_g' | 'fat_target_g'
> &
  Partial<Pick<ProfileRow, 'protein_target_g' | 'carbs_target_g' | 'fat_target_g'>>;

// What other modules (friends, notifications) may show about a person.
export type PersonCard = { userId: string; username: string | null; displayName: string | null };

export interface Avoids {
  proteins: ProteinType[];
  dishes: string[];
}

// A row of public.user_avoids as written; listAvoids joins the dish slug.
export interface AvoidRow {
  kind: 'dish' | 'protein';
  protein: ProteinType | null;
  dish_id: string | null;
}

export interface AvoidListRow {
  kind: 'dish' | 'protein';
  protein: ProteinType | null;
  dishes: { slug: string } | null;
}
