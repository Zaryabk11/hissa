export type Energy = 'low' | 'okay' | 'good';
export type Stomach = 'heavy' | 'fine' | 'light';
export type Symptom = 'bloated' | 'upset' | 'other' | 'not_sure';

// The optional symptom tap is offered only after a "heavy" stomach answer.
export const needsSymptomDetail = (stomach: Stomach | null): boolean => stomach === 'heavy';

export const canSubmit = (energy: Energy | null, stomach: Stomach | null): boolean =>
  energy !== null && stomach !== null;
