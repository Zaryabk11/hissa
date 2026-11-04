// Drafts one recipe per dish with Gemini, OFFLINE, into database/data/recipes.json (reviewed: false).
// A human reviews before anything is served. Run: npx tsx --env-file=.env scripts/draft-recipes.ts
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkRecipeDraft, mergeDrafts, type RecipeDraft } from './recipe-draft-guard';

const DISHES = [
  'chicken-karahi', 'chicken-biryani', 'chicken-pulao', 'chicken-korma', 'chicken-tikka',
  'aloo-gosht', 'mutton-karahi', 'beef-pulao', 'nihari', 'keema', 'kofta', 'palak-gosht',
  'machli', 'fish-curry', 'chana-daal', 'maash-daal', 'mixed-daal', 'daal-kaddu', 'choley',
  'lobia', 'bhindi', 'aloo-palak', 'mixed-sabzi', 'khichdi', 'kadhi-pakora', 'egg-fried-rice',
  'raita',
];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const key = process.env.GEMINI_API_KEY ?? '';
const model = process.env.GEMINI_MODEL ?? '';
if (!key || !model) throw new Error('Set GEMINI_API_KEY and GEMINI_MODEL (backend/.env)');
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const str = { type: 'STRING' };
const responseSchema = {
  type: 'OBJECT',
  properties: {
    title: str,
    minutes: { type: 'INTEGER' },
    servings: { type: 'INTEGER' },
    ingredients: {
      type: 'ARRAY',
      items: { type: 'OBJECT', properties: { item: str, quantity: str }, required: ['item', 'quantity'] },
    },
    steps: { type: 'ARRAY', items: str },
  },
  required: ['title', 'minutes', 'servings', 'ingredients', 'steps'],
};

async function draft(dish: string): Promise<unknown> {
  const prompt =
    `Write a plain home-style Pakistani recipe for "${dish.replaceAll('-', ' ')}". Give a title, total minutes, servings, ` +
    'ingredients with quantities (3 to 15), and short steps (3 to 12). Do not mention calories, nutrition, health, diet or medical claims.';
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema },
  });
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body,
      signal: AbortSignal.timeout(60000),
    });
    if (res.status === 429 && attempt === 1) {
      await sleep(30000); // free-tier per-minute quota
      continue;
    }
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`); // never log the URL or key
    const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const parsed = JSON.parse(json.candidates?.[0]?.content?.parts?.[0]?.text ?? '');
    return { ...parsed, slug: dish, dish, reviewed: false };
  }
}

const out = join(__dirname, '../../database/data/recipes.json');
const catalogSlugs = new Set(
  readFileSync(join(__dirname, '../../database/data/catalog.csv'), 'utf8')
    .split(/\r?\n/)
    .slice(1)
    .map((l) => l.split(',')[0] ?? '')
    .filter(Boolean),
);

async function main() {
  // recipes.json is the source of truth once a human edits it: never redraft or overwrite its slugs.
  const existing: RecipeDraft[] = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : [];
  const have = new Set(existing.map((r) => r.slug));
  const accepted: RecipeDraft[] = [];
  for (const dish of DISHES.filter((d) => !have.has(d))) {
    try {
      const checked = checkRecipeDraft(await draft(dish), catalogSlugs);
      if (checked.ok) accepted.push(checked.recipe);
      else console.log(`REJECTED ${dish}: ${checked.reason}`);
    } catch (err) {
      console.log(`FAILED ${dish}: ${err instanceof Error ? err.message : 'error'}`);
    }
    await sleep(2000);
  }
  if (accepted.length === 0) return console.log('No new drafts; recipes.json left untouched');
  writeFileSync(out, JSON.stringify(mergeDrafts(existing, accepted), null, 2) + '\n');
  console.log(`${accepted.length} new drafts written to ${out}`);
}
void main();
