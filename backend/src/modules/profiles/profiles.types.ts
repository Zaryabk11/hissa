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
}

export interface Profile {
  id: string;
  displayName: string | null;
  goal: Goal;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  dailyCalorieBudget: number;
}

// A row of public.profiles as the repository reads and writes it.
export interface ProfileRow {
  id: string;
  display_name: string | null;
  goal: Goal;
  sex: Sex;
  age: number;
  height_cm: number;
  weight_kg: number;
  activity_level: ActivityLevel;
  daily_calorie_budget: number | null;
}

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
