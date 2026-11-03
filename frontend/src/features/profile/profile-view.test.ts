import { describe, expect, it } from 'vitest';
import type { Profile } from '../core/api';
import { BOUNDS, clamp, formToPayload, isDirty, profileToForm } from './profile-view';

const server: Profile = {
  id: 'u1',
  displayName: 'Ayesha',
  goal: 'maintain',
  sex: 'female',
  age: 25,
  heightCm: 160,
  weightKg: 60,
  activityLevel: 'moderate',
  dailyCalorieBudget: 2000,
};

describe('profile form mapping', () => {
  it('shows cm as whole inches and keeps all four activity levels', () => {
    expect(profileToForm(server)).toEqual({
      displayName: 'Ayesha',
      goal: 'maintain',
      sex: 'female',
      age: 25,
      heightIn: 63,
      weightKg: 60,
      activityLevel: 'moderate',
    });
  });

  it('is not dirty until something changes, and keeps the stored cm when the shown inches did not change', () => {
    const form = profileToForm(server);
    expect(isDirty(form, server)).toBe(false);
    expect(formToPayload(form, server).heightCm).toBe(160);
    const taller = { ...form, heightIn: 64 };
    expect(isDirty(taller, server)).toBe(true);
    expect(formToPayload(taller, server).heightCm).toBe(162.56);
  });

  it('sends a trimmed name, omits a blank one, and never sends a budget', () => {
    const form = profileToForm(server);
    expect(formToPayload({ ...form, displayName: '  Sana  ' }, server).displayName).toBe('Sana');
    const blank = formToPayload({ ...form, displayName: '   ' }, server);
    expect('displayName' in blank).toBe(false);
    expect('dailyCalorieBudget' in blank).toBe(false);
  });

  it('treats a name change that only adds spaces as unchanged and a null name as blank', () => {
    expect(isDirty({ ...profileToForm(server), displayName: 'Ayesha ' }, server)).toBe(false);
    expect(profileToForm({ ...server, displayName: null }).displayName).toBe('');
  });

  it('keeps stepper bounds inside the backend schema (age 10-120)', () => {
    expect(BOUNDS.age).toEqual([10, 120]);
    expect(clamp(5, ...BOUNDS.age)).toBe(10);
    expect(clamp(500, ...BOUNDS.age)).toBe(120);
  });
});
