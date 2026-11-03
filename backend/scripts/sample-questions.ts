// Prints generated check-in questions next to the summary they were drafted from, for manual review.
// Uses real Gemini only if GEMINI_API_KEY is set; otherwise canned drafts (some deliberately unsafe).
//   cd backend && npx tsx scripts/sample-questions.ts
import type { FeelRepository } from '../src/modules/feel/feel.repository';
import { createFeelService } from '../src/modules/feel/feel.service';
import type { Observation } from '../src/modules/feel/feel.types';
import {
  createGeminiQuestionClient,
  type GeminiQuestionClient,
} from '../src/modules/feel/gemini-question.client';

const now = new Date('2026-11-02T12:00:00Z');
const obs = (i: number, slug: string, stomach: Observation['stomach']): Observation => {
  const eaten = new Date(+now - (i + 3) * 86_400_000);
  return {
    userId: 'u',
    mealId: `m${i}`,
    eatenAt: eaten.toISOString(),
    checkedInAt: new Date(+eaten + 2 * 3_600_000).toISOString(),
    dishes: [{ slug, category: 'other' }],
    energy: 'okay',
    stomach,
    symptom: null,
    answerId: null,
  };
};
const histories: Record<string, Observation[]> = {
  'no history': [],
  'three check-ins, no repeats': [obs(1, 'a', 'fine'), obs(2, 'b', 'heavy'), obs(3, 'c', 'fine')],
  'raita repeats with heavy stomach': [
    obs(1, 'raita', 'heavy'),
    obs(2, 'raita', 'heavy'),
    obs(3, 'dal', 'fine'),
    obs(4, 'roti', 'fine'),
    obs(5, 'rice', 'fine'),
  ],
};
const canned = [
  'How is your stomach feeling right now?',
  'Which word best describes your stomach discomfort?',
  'Is your tummy upset?',
  'You are lactose intolerant, which kind of discomfort is it?',
  'After 3 raita meals, how is your stomach feeling?',
  'What upset your stomach?',
  'Which food upset your stomach?',
  'Is your stomach discomfort a sign of something serious?',
  'Did you already feel this way before this meal?',
  'How does your stomach feel after this meal?',
];

const key = process.env.GEMINI_API_KEY;
let n = 0;
const fake: GeminiQuestionClient = {
  async draft({ allowedOptionIds }) {
    return { text: canned[n++ % canned.length] ?? '', optionIds: allowedOptionIds };
  },
};
const client = key
  ? createGeminiQuestionClient({
      apiKey: key,
      model: process.env.GEMINI_MODEL || 'gemini-flash-lite-latest',
    })
  : fake;
console.log(key ? 'Client: REAL Gemini' : 'Client: canned drafts (no GEMINI_API_KEY)');

const meal = {
  id: 'meal',
  eatenAt: new Date(+now - 120 * 60000).toISOString(),
  dishes: ['x'],
  checkedIn: false,
};
async function main() {
  for (const [name, history] of Object.entries(histories)) {
    const repository = {
      findMeal: async () => meal,
      listObservations: async () => history,
    } as unknown as FeelRepository;
    const rounds = key ? 3 : canned.length;
    for (let i = 0; i < rounds; i++) {
      let summary = '';
      const spy: GeminiQuestionClient = {
        async draft(input) {
          summary = input.evidenceSummary;
          const out = await client.draft(input);
          console.log(`  draft: ${JSON.stringify(out.text)}`);
          return out;
        },
      };
      const q = await createFeelService({ repository, questionClient: spy }).getQuestion(
        'u',
        'meal',
        now,
      );
      console.log(`[${name}] summary: ${summary}`);
      console.log(
        `  -> ${q.source.toUpperCase()} (${q.intent}): ${q.text} [${q.options.map((o) => o.id).join('|')}]\n`,
      );
    }
  }
}
void main();
