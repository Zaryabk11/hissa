import { apiAuthed } from '../../shared/api/client';

export type ApiDish = {
  slug: string;
  name: string;
  unit: 'roti' | 'katori' | 'plate' | 'piece' | 'glass' | 'bowl';
  gramsPerUnit: number;
  kcalPer100g: number;
};
export type Profile = {
  id: string;
  displayName: string | null;
  goal: 'lose' | 'maintain';
  sex: 'male' | 'female';
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active';
  dailyCalorieBudget: number;
};
export type ProteinType = 'beef' | 'mutton' | 'chicken' | 'fish' | 'egg' | 'veg';
export type Avoids = { proteins: ProteinType[]; dishes: string[] };
export type ScanItem = {
  dish: string;
  name: string | null;
  unit: ApiDish['unit'] | null;
  portion: number;
  confidence: number;
  needsConfirmation: boolean;
  avoided: boolean;
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
export const getAvoids = () => apiAuthed<Avoids>('/api/profiles/me/avoids');
export const putAvoids = (body: Avoids) =>
  apiAuthed<Avoids>('/api/profiles/me/avoids', { ...json(body), method: 'PUT' });
// The catalog changes rarely: share one in-flight request and reuse the answer for a few minutes.
const CATALOG_TTL_MS = 5 * 60_000;
let catalog: { at: number; request: Promise<{ dishes: ApiDish[] }> } | null = null;
export const getCatalog = () => {
  if (!catalog || Date.now() - catalog.at > CATALOG_TTL_MS) {
    const request = apiAuthed<{ dishes: ApiDish[] }>('/api/nutrition/catalog');
    const entry = { at: Date.now(), request };
    catalog = entry;
    // A failed request must not be cached.
    request.catch(() => {
      if (catalog === entry) catalog = null;
    });
  }
  return catalog.request;
};
// The web camera returns a data: URI (often PNG); the API wants raw base64 and the real mime type.
export const scanPhoto = (image: string, mimeType: string) => {
  const m = /^data:([^;,]+)[^,]*,/.exec(image);
  return apiAuthed<ScanResult>('/api/scan', {
    ...json({ image: m ? image.slice(m[0].length) : image, mimeType: m?.[1] ?? mimeType }),
    // Longer than the API's worst case (3 Gemini attempts of 10 s plus pauses), so the API answers first.
    signal: AbortSignal.timeout(45_000),
  });
};
export const getPlan = (items: { slug: string; units: number }[]) =>
  apiAuthed<Plan>('/api/plan', json({ items }));
export const saveMeal = (items: MealInput[]) => apiAuthed<ApiMeal>('/api/meals', json({ items }));
export const getToday = () => apiAuthed<Today>('/api/meals/today');
