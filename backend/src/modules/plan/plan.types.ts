// Domain types for the plan module.
export interface PlanItem {
  slug: string;
  name: string;
  unit: string;
  requestedUnits: number;
  units: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface Plan {
  kind: 'full' | 'reduced' | 'minimum' | 'light';
  remainingBefore: number;
  totalCalories: number;
  remainingAfter: number;
  items: PlanItem[];
  suggestions: PlanItem[];
  isEstimate: true;
}
