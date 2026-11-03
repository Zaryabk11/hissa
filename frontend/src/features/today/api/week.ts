import { apiAuthed } from '../../../shared/api/client';

export type WeekDay = { day: string; totalCalories: number; mealCount: number };

/** Seven days, oldest first, today last. Days with no meals are 0 and 0. */
export const getWeek = () => apiAuthed<{ days: WeekDay[] }>('/api/meals/week');
