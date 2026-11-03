import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { createFeelService } from '../feel.service';
import type { FeelRepository } from '../feel.repository';
import type { Observation } from '../feel.types';

// Runs the demo seed script's generated history through the real weekly pattern rule.
const root = join(__dirname, '..', '..', '..', '..', '..');
const DEMO = '4f1b2c3d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
const NOW = new Date('2026-11-03T10:00:00Z');
interface History {
  meals: { id: string; eaten_at: string }[];
  items: { meal_id: string; slug: string }[];
  checkins: {
    meal_id: string;
    energy: Observation['energy'];
    stomach: Observation['stomach'];
    created_at: string;
  }[];
}

async function observations(): Promise<Observation[]> {
  const script = pathToFileURL(join(root, 'database/scripts/seed-demo-history.mjs')).href;
  const { buildDemoHistory } = (await import(script)) as {
    buildDemoHistory: (userId: string, now: Date) => History;
  };
  const csv = readFileSync(join(root, 'database/data/catalog.csv'), 'utf8').split('\n');
  const category = Object.fromEntries(csv.map((l) => l.split(',')).map((c) => [c[0], c[2] ?? '']));
  const { meals, items, checkins } = buildDemoHistory(DEMO, NOW);
  return meals.map((m) => {
    const c = checkins.find((x) => x.meal_id === m.id);
    if (!c) throw new Error('meal without check-in');
    return {
      userId: DEMO,
      mealId: m.id,
      eatenAt: m.eaten_at,
      checkedInAt: c.created_at,
      dishes: items
        .filter((i) => i.meal_id === m.id)
        .map((i) => ({ slug: i.slug, category: category[i.slug] ?? 'other' })),
      energy: c.energy,
      stomach: c.stomach,
      symptom: null,
      answerId: null,
    };
  });
}
const service = (demoUserId?: string) =>
  createFeelService({
    repository: {
      listObservations: vi.fn(async () => observations()),
    } as unknown as FeelRepository,
    questionClient: { draft: async () => ({ text: '', optionIds: [] }) },
    demoUserId,
  });

describe('demo seed history', () => {
  it('gives the demo user a real, sample-labelled pattern card', async () => {
    const card = await service(DEMO).getWeeklyPattern(DEMO, NOW);
    expect(card).toMatchObject({ state: 'pattern', isSample: true });
    expect(card.pattern).toMatchObject({
      patternKey: 'category:rice:heavy',
      matching: 4,
      relevant: 5,
    });
  });

  it('does not label the same history as sample for any other account', async () => {
    expect((await service(DEMO).getWeeklyPattern('someone-else', NOW)).isSample).toBe(false);
  });
});
