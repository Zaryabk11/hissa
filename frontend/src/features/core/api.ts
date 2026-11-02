import { apiAuthed } from '../../shared/api/client';

export type ApiDish = {
  slug: string;
  name: string;
  unit: 'roti' | 'katori' | 'plate' | 'piece' | 'glass' | 'bowl';
  gramsPerUnit: number;
  kcalPer100g: number;
};
export type Profile = {
  displayName: string | null;
  dailyCalorieBudget: number;
};
export type ScanItem = {
  dish: string;
  name: string | null;
  unit: ApiDish['unit'] | null;
  portion: number;
  confidence: number;
  needsConfirmation: boolean;
};
export type ScanResult =
  | { mode: 'detected'; items: ScanItem[] }
  | { mode: 'manual'; reason: 'daily_cap' | 'gemini_unavailable' };
export type Plan = {
  kind: 'full' | 'reduced' | 'minimum' | 'light';
  totalCalories: number;
  items: { slug: string; name: string; unit: ApiDish['unit']; units: number; calories: number }[];
  suggestions: { slug: string; name: string; unit: ApiDish['unit']; units: number }[];
  isEstimate: true;
};
export type MealInput = {
  predictedDish: string | null;
  predictedPortion: number | null;
  confirmedDish: string | null;
  confirmedPortion: number | null;
  confidence: number | null;
};
export type ApiMeal = { id: string; eatenAt: string; totalCalories: number; items: MealInput[] };
export type Today = { day: string; meals: ApiMeal[]; totalCalories: number };

const json = (body: unknown) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const getProfile = () => apiAuthed<Profile>('/api/profiles/me');
export const putProfile = (body: unknown) =>
  apiAuthed<Profile>('/api/profiles/me', { ...json(body), method: 'PUT' });
export const getCatalog = () => apiAuthed<{ dishes: ApiDish[] }>('/api/nutrition/catalog');
// The web camera returns a data: URI (often PNG); the API wants raw base64 and the real mime type.
export const scanPhoto = (image: string, mimeType: string) => {
  const m = /^data:([^;,]+)[^,]*,/.exec(image);
  return apiAuthed<ScanResult>('/api/scan', {
    ...json({ image: m ? image.slice(m[0].length) : image, mimeType: m?.[1] ?? mimeType }),
    signal: AbortSignal.timeout(30_000),
  });
};
export const getPlan = (items: { slug: string; units: number }[]) =>
  apiAuthed<Plan>('/api/plan', json({ items }));
export const saveMeal = (items: MealInput[]) =>
  apiAuthed<ApiMeal>('/api/meals', json({ items }));
export const getToday = () => apiAuthed<Today>('/api/meals/today');
