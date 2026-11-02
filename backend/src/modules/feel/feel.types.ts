export interface CheckinInput {
  mealId: string;
  energy: 'low' | 'okay' | 'good';
  stomach: 'heavy' | 'fine' | 'light';
  symptom?: 'bloated' | 'upset' | 'other' | 'not_sure';
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
}
