import type { QuestionIntent } from './question-model';

export interface QuestionOption {
  id: string;
  label: string;
}
export interface Question {
  mealId: string;
  intent: QuestionIntent;
  text: string;
  options: QuestionOption[];
  source: 'gemini' | 'fallback';
}

// The only options a question may carry. Gemini never supplies or reorders them.
export const questionBank: Record<QuestionIntent, { text: string; options: QuestionOption[] }> = {
  symptom_detail: {
    text: 'How would you describe your stomach discomfort?',
    options: [
      { id: 'bloated', label: 'Bloated' },
      { id: 'upset', label: 'Upset' },
      { id: 'other', label: 'Other' },
      { id: 'not_sure', label: 'Not sure' },
    ],
  },
  pre_existing: {
    text: 'Did you already feel this way before this meal?',
    options: [
      { id: 'yes', label: 'Yes' },
      { id: 'no', label: 'No' },
      { id: 'not_sure', label: 'Not sure' },
    ],
  },
};

// Only symptom_detail is served for now (pre_existing has no place to store its answer yet).
// Gemini may only reword that question, and the wording guard is an ALLOWLIST: every word must be
// in this small vocabulary, so a draft cannot name a food, a number, a cause, a diagnosis or advice.
// It checks vocabulary and shape, not meaning: "How does your stomach feel right now?" and the
// fixed question both pass, and a vocabulary-only reshuffle could still be an odd sentence.
const WORDS = new Set(
  `how what which would does do did is are you your this the after right now best word describe
   describes stomach feel feels feeling felt discomfort fits matches meal`.split(/\s+/),
);

export function isSafeWording(text: string): boolean {
  if (text.length > 120 || !/^[A-Za-z]+( [A-Za-z]+)*\?$/.test(text)) return false;
  const words = text.slice(0, -1).toLowerCase().split(' ');
  return (
    /^(how|what|which)$/.test(words[0] ?? '') &&
    words.some((w) => w === 'stomach' || w === 'discomfort') &&
    words.every((w) => WORDS.has(w))
  );
}
