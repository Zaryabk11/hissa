export interface CheckinInput {
  mealId: string;
  energy: 'low' | 'okay' | 'good';
  stomach: 'heavy' | 'fine' | 'light';
  symptom?: 'bloated' | 'upset' | 'other' | 'not_sure';
  // Optional answer to the pre_existing follow-up; both or neither.
  questionType?: 'pre_existing';
  answerId?: 'yes' | 'no' | 'not_sure';
}
export interface CheckinMeal {
  id: string;
  eatenAt: string;
  dishes: string[];
  checkedIn: boolean;
}
export interface DueCheckin {
  mealId: string;
  eatenAt: string;
  dishes: string[];
}
// One whole meal with its check-in; confirmed dishes only.
export interface MealObservation {
  userId: string;
  mealId: string;
  eatenAt: string;
  dishes: { slug: string; category: string }[];
  energy: CheckinInput['energy'];
  stomach: CheckinInput['stomach'];
  symptom: NonNullable<CheckinInput['symptom']> | null;
  answerId: string | null;
  questionType: string | null;
}
// What the repository returns; the service decides which rows count as evidence.
export interface Observation extends MealObservation {
  checkedInAt: string;
}

export type ExperimentAction = 'smaller_portion' | 'different_side' | 'observe_again';
// What the repository returns for a user_experiments row (the user id is never carried out).
export interface ExperimentRow {
  id: string;
  patternKey: string;
  action: ExperimentAction;
  status: 'active' | 'tried';
  createdAt: string;
  triedAt: string | null;
  triedMealId: string | null;
}
// The API shape. `tried` shows how the owner's own check-in for that meal looked, nothing more.
export interface Experiment {
  id: string;
  patternKey: string;
  action: ExperimentAction;
  status: 'active' | 'tried';
  createdAt: string;
  triedAt: string | null;
  tried: {
    mealId: string;
    energy: CheckinInput['energy'] | null;
    stomach: CheckinInput['stomach'] | null;
  } | null;
}
