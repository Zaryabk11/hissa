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
export const questionBank: Record<
  QuestionIntent,
  { text: string; options: QuestionOption[]; shape: RegExp }
> = {
  symptom_detail: {
    text: 'How would you describe your stomach discomfort?',
    shape: /^(how|which|what)\b(?=.*\b(stomach|discomfort)\b)/i,
    options: [
      { id: 'bloated', label: 'Bloated' },
      { id: 'upset', label: 'Upset' },
      { id: 'other', label: 'Other' },
      { id: 'not_sure', label: 'Not sure' },
    ],
  },
  pre_existing: {
    text: 'Did you already feel this way before this meal?',
    shape: /^(did|was|were|had)\b(?=.*\bbefore\b)(?=.*\b(feel|felt|feeling|stomach|discomfort)\b)/i,
    options: [
      { id: 'yes', label: 'Yes' },
      { id: 'no', label: 'No' },
      { id: 'not_sure', label: 'Not sure' },
    ],
  },
};

// Gemini may only reword the question. A draft must be one short plain-letter question in the
// intent's shape (how/which/what about the stomach, or did/was about "before") with no numbers,
// diagnoses, restrictions, advice or causal claims.
const UNSAFE = new RegExp(
  [
    String.raw`\d`,
    String.raw`\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|twice|thrice|times|often|always|never|usually|every|most|many|several|both)\b`,
    String.raw`intoleran|allerg|celiac|coeliac|\bibs\b|gastritis|ulcer|reflux|diabet|disease|disorder|syndrome|infection|poison|condition|diagnos`,
    String.raw`avoid|eliminat|cut out|give up|stop eating|\bdiet\b|should|must|recommend|doctor|medic|treat|cure|\btry\b`,
    String.raw`caus|because|due to|\bled?\b|lead|trigger|result|blame|culprit|\blinked?\b|\breason|make you|made you|makes you`,
    String.raw`\byou (are|have|seem)\b`,
  ].join('|'),
  'i',
);

export function isSafeWording(text: string, intent: QuestionIntent): boolean {
  return (
    text.length <= 120 &&
    /^[A-Za-z][A-Za-z ,'’-]*\?$/.test(text) &&
    questionBank[intent].shape.test(text) &&
    !UNSAFE.test(text)
  );
}
