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
  username: string | null;
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
  username: string | null;
  display_name: string | null;
  goal: Goal;
  sex: Sex;
  age: number;
  height_cm: number;
  weight_kg: number;
  activity_level: ActivityLevel;
  daily_calorie_budget: number | null;
}

export type CardRow = Pick<ProfileRow, 'id' | 'username' | 'display_name'>;

export type ProfileUpsertRow = Omit<ProfileRow, 'username'>;

// What other modules (friends, notifications) may show about a person.
export type PersonCard = { userId: string; username: string | null; displayName: string | null };
