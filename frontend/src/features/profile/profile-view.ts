import type { Profile } from '../core/api';

export type ProfileForm = {
  displayName: string;
  goal: Profile['goal'];
  sex: Profile['sex'];
  age: number;
  heightIn: number;
  weightKg: number;
  activityLevel: Profile['activityLevel'];
  // Daily macro targets as typed digits; blank means not set.
  proteinTarget: string;
  carbsTarget: string;
  fatTarget: string;
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
  proteinTarget: p.proteinTargetG?.toString() ?? '',
  carbsTarget: p.carbsTargetG?.toString() ?? '',
  fatTarget: p.fatTargetG?.toString() ?? '',
});

/** Blank or not a whole 1-1000 number means no target (null, which clears it on the server). */
export const parseTarget = (s: string): number | null => {
  const n = Number(s.trim());
  return s.trim() !== '' && Number.isInteger(n) && n >= 1 && n <= 1000 ? n : null;
};

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
    proteinTargetG: parseTarget(f.proteinTarget),
    carbsTargetG: parseTarget(f.carbsTarget),
    fatTargetG: parseTarget(f.fatTarget),
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
    next.activityLevel !== original.activityLevel ||
    next.proteinTargetG !== original.proteinTargetG ||
    next.carbsTargetG !== original.carbsTargetG ||
    next.fatTargetG !== original.fatTargetG
  );
};

export const feetInches = (inches: number) => `${Math.floor(inches / 12)}'${inches % 12}"`;
