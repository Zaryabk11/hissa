import { createStore, loadJSON, saveJSON } from '../../shared/storage';
import { placeholderDailyKcal } from './placeholderDailyKcal';

export type Goal = 'lighter' | 'steady';
export type Sex = 'male' | 'female';
export type Activity = 'sitting' | 'onFeet' | 'active';

export type Answers = {
  goal: Goal;
  age: number;
  heightIn: number;
  weightKg: number;
  sex: Sex;
  activity: Activity;
  /** Not asked in onboarding yet. Today shows just "Salaam" without it. */
  name?: string;
};

const KEY = 'hissa.onboarding';

// Defaults match the preselected values in the design.
const store = createStore<{ answers: Answers; hydrated: boolean; finished: boolean; ownerId: string | null }>({
  answers: { goal: 'lighter', age: 28, heightIn: 67, weightKg: 72, sex: 'male', activity: 'onFeet' },
  hydrated: false,
  finished: false,
  ownerId: null,
});
let touched = false;

/** Saved with the budget (an estimate) so it survives a restart. Today recomputes the budget from the answers. */
const persist = () => {
  const { answers } = store.get();
  saveJSON(KEY, { answers, finished: store.get().finished, ownerId: store.get().ownerId, budget: placeholderDailyKcal(answers) });
};

export function setAnswers(patch: Partial<Answers>) {
  touched = true;
  store.set({ answers: { ...store.get().answers, ...patch } });
  persist();
}

export const getAnswers = (): Answers => store.get().answers;
export const useAnswers = (): Answers => store.use().answers;
export const useAnswersHydrated = (): boolean => store.use().hydrated;
export const getOnboardingFinished = (): boolean => store.get().finished;
export const getOnboardingOwner = (): string | null => store.get().ownerId;
export function finishOnboarding(ownerId?: string) {
  store.set({ finished: true, ownerId: ownerId ?? null });
  persist();
}

export async function hydrateAnswers() {
  const saved = await loadJSON<{ answers: Answers; finished?: boolean; ownerId?: string | null }>(KEY);
  // Anything the user already changed in this session wins over what was saved.
  store.set(saved && !touched ? { answers: { ...store.get().answers, ...saved.answers }, finished: !!saved.finished, ownerId: saved.ownerId ?? null, hydrated: true } : { hydrated: true });
}

/** Back to the defaults (used by the demo "clear all data" action). */
export function resetAnswers() {
  touched = true;
  store.set({ answers: { goal: 'lighter', age: 28, heightIn: 67, weightKg: 72, sex: 'male', activity: 'onFeet' }, finished: false, ownerId: null });
  persist();
}
