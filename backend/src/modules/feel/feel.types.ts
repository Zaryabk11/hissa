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
