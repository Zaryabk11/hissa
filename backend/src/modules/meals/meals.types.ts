// Domain types for the meals module. Dishes are identified by catalog slug.
export interface SaveMealItemInput {
  predictedDish: string | null; // null: unknown, or a dish the user added
  predictedPortion: number | null;
  confirmedDish: string | null; // null: the user removed it
  confirmedPortion: number | null;
  confidence: number | null;
}

export interface SaveMealInput {
  items: SaveMealItemInput[];
}

export type MealItem = SaveMealItemInput;

export interface Meal {
  id: string;
  eatenAt: string;
  totalCalories: number; // an estimate
  items: MealItem[];
}

export interface MealItemRow {
  meal_id: string;
  predicted_dish_id: string | null;
  confirmed_dish_id: string | null;
  predicted_portion: number | null;
  confirmed_portion: number | null;
  confidence: number | null;
}
