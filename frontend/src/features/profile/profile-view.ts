import type { Profile } from '../core/api';

export type ProfileForm = {
  displayName: string;
  goal: Profile['goal'];
  sex: Profile['sex'];
  age: number;
  heightIn: number;
  weightKg: number;
  activityLevel: Profile['activityLevel'];
};

// Stepper limits. The backend accepts age 10-120, height up to 300 cm, weight up to 500 kg; these stay inside that.
export const BOUNDS = { age: [10, 120], heightIn: [48, 90], weightKg: [30, 200] } as const;
export const NAME_MAX = 80;

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const cmToIn = (cm: number) => Math.round(cm / 2.54);

export const profileToForm = (p: Profile): ProfileForm => ({
  displayName: p.displayName ?? '',
  goal: p.goal,
  sex: p.sex,
  age: p.age,
  heightIn: cmToIn(p.heightCm),
  weightKg: p.weightKg,
  activityLevel: p.activityLevel,
});

/** The PUT body. The server recomputes the budget, so none is sent. A blank name is omitted (the server stores no name). */
export function formToPayload(f: ProfileForm, original: Profile) {
  const name = f.displayName.trim();
  return {
    ...(name ? { displayName: name } : {}),
    goal: f.goal,
    sex: f.sex,
    age: f.age,
    // Height is shown in whole inches: keep the stored cm unless the shown value changed.
    heightCm:
      f.heightIn === cmToIn(original.heightCm)
        ? original.heightCm
        : Math.round(f.heightIn * 2.54 * 100) / 100,
    weightKg: f.weightKg,
    activityLevel: f.activityLevel,
  };
}

export const isDirty = (f: ProfileForm, original: Profile): boolean => {
  const next = formToPayload(f, original);
  return (
    (next.displayName ?? '') !== (original.displayName ?? '').trim() ||
    next.goal !== original.goal ||
    next.sex !== original.sex ||
    next.age !== original.age ||
    next.heightCm !== original.heightCm ||
    next.weightKg !== original.weightKg ||
    next.activityLevel !== original.activityLevel
  );
};

export const feetInches = (inches: number) => `${Math.floor(inches / 12)}'${inches % 12}"`;
