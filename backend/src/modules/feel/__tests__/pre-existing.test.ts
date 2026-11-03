import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { Db } from '../../../shared/db';
import { createFeelRepository, type FeelRepository } from '../feel.repository';
import { createFeelService } from '../feel.service';
import type { Observation } from '../feel.types';
import { questionBank } from '../question-bank';

const now = new Date('2026-11-03T10:00:00Z');
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const mealId = '11111111-1111-4111-8111-111111111111';

function setup(lastAt: string | null | Error = null, observations: Observation[] = []) {
  const draft = vi.fn().mockResolvedValue({
    text: 'Which word best describes how your stomach feels?',
    optionIds: ['bloated', 'upset', 'other', 'not_sure'],
  });
  const findLastPreExistingAt = vi.fn(async (userId: string) => {
    if (lastAt instanceof Error) throw lastAt;
    return userId === 'owner' ? lastAt : null;
  });
  const repository = {
    async findMeal(userId: string, id: string) {
      return userId === 'owner' && id === mealId
        ? {
            id,
            eatenAt: new Date(+now - 2 * HOUR).toISOString(),
            checkedIn: false,
            dishes: ['Raita'],
          }
        : null;
    },
    listObservations: vi.fn(async () => observations),
    findLastPreExistingAt,
  } as unknown as FeelRepository;
  return {
    service: createFeelService({ repository, questionClient: { draft } }),
    draft,
    findLastPreExistingAt,
  };
}
const ago = (days: number) => new Date(+now - days * DAY).toISOString();

describe('pre_existing follow-up question', () => {
  it('is the fixed bank question, never sent to Gemini, when nothing was answered before', async () => {
    const { service, draft, findLastPreExistingAt } = setup();
    const q = await service.getQuestion('owner', mealId, now, true);
    expect(q).toEqual({
      mealId,
      intent: 'pre_existing',
      text: questionBank.pre_existing.text,
      options: questionBank.pre_existing.options,
      source: 'fallback',
    });
    expect(findLastPreExistingAt).toHaveBeenCalledWith('owner');
    expect(draft).not.toHaveBeenCalled();
  });

  it.each([
    [14, 'pre_existing'],
    [13.9, 'symptom_detail'],
    [1, 'symptom_detail'],
  ])('with the last answer %s days ago serves %s', async (days, intent) => {
    const { service } = setup(ago(days));
    expect((await service.getQuestion('owner', mealId, now, true)).intent).toBe(intent);
  });

  it('keeps today’s symptom question unless the caller asks for the follow-up', async () => {
    const { service, draft, findLastPreExistingAt } = setup();
    expect((await service.getQuestion('owner', mealId, now)).intent).toBe('symptom_detail');
    expect(findLastPreExistingAt).not.toHaveBeenCalled();
    expect(draft).toHaveBeenCalledTimes(1);
  });

  it('falls back to the symptom question if the lookup fails (never blocks the check-in)', async () => {
    const { service } = setup(new Error('db down'));
    expect((await service.getQuestion('owner', mealId, now, true)).intent).toBe('symptom_detail');
  });

  it('keeps the foreign and ineligible meal handling', async () => {
    const { service } = setup();
    await expect(service.getQuestion('other', mealId, now, true)).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      service.getQuestion('owner', mealId, new Date(+now - 2 * DAY), true),
    ).rejects.toMatchObject({ status: 400 });
  });
});

let seq = 0;
function row(over: Partial<Observation> = {}): Observation {
  seq += 1;
  const eaten = new Date(+now - (seq + 1) * 2 * HOUR);
  return {
    userId: 'owner',
    mealId: `m${seq}`,
    eatenAt: eaten.toISOString(),
    checkedInAt: new Date(+eaten + 2 * HOUR).toISOString(),
    dishes: [{ slug: 'biryani', category: 'rice' }],
    energy: 'okay',
    stomach: 'heavy',
    symptom: null,
    answerId: null,
    questionType: null,
    ...over,
  };
}
const answered = (answerId: string) => row({ questionType: 'pre_existing', answerId });

describe('a stomach already unhappy before the meal is not evidence', () => {
  it('drops pre_existing=yes from the weekly pattern, keeps no and not_sure', async () => {
    const rows = [
      ...Array.from({ length: 4 }, () => row()),
      answered('no'),
      answered('not_sure'),
      answered('yes'),
    ];
    const card = await setup(null, rows).service.getWeeklyPattern('owner', now);
    expect(card.checkins).toBe(6);
  });

  it('drops it from the per-user model summary too', async () => {
    const { service, draft } = setup(null, [row(), row(), answered('yes')]);
    await service.getQuestion('owner', mealId, now);
    expect(draft.mock.calls[0]?.[0].evidenceSummary).toContain('2 check-ins');
  });

  it('only a pre_existing answer counts: a stray "yes" without the question type stays', async () => {
    const rows = Array.from({ length: 7 }, () => row({ answerId: 'yes' }));
    const card = await setup(null, rows).service.getWeeklyPattern('owner', now);
    expect(card.checkins).toBe(7);
  });

  it('does not change the weekly card wording', async () => {
    const rows = Array.from({ length: 7 }, () => row());
    const same = [...rows, answered('yes')];
    const a = await setup(null, rows).service.getWeeklyPattern('owner', now);
    const b = await setup(null, same).service.getWeeklyPattern('owner', now);
    expect(b).toEqual(a);
  });
});

describe('repository', () => {
  function fakeDb(data: unknown) {
    const calls: [string, ...unknown[]][] = [];
    const chain: Record<string, unknown> = {};
    for (const m of ['select', 'insert', 'eq', 'order', 'limit'])
      chain[m] = (...args: unknown[]) => (calls.push([m, ...args]), chain);
    chain.single = chain.maybeSingle = async () => ({ data, error: null });
    return {
      db: { from: (t: string) => (calls.push(['from', t]), chain) } as unknown as Db,
      calls,
    };
  }
  it('writes the pair and its source to the existing columns', async () => {
    const { db, calls } = fakeDb({ id: 'c1' });
    await createFeelRepository(db).insertCheckin('owner', {
      mealId,
      energy: 'okay',
      stomach: 'heavy',
      symptom: null,
      questionType: 'pre_existing',
      answerId: 'yes',
      questionSource: 'fallback',
    });
    expect(calls).toContainEqual([
      'insert',
      expect.objectContaining({
        user_id: 'owner',
        question_type: 'pre_existing',
        answer_id: 'yes',
        question_source: 'fallback',
      }),
    ]);
  });
  it('leaves the columns null without a pair', async () => {
    const { db, calls } = fakeDb({ id: 'c1' });
    await createFeelRepository(db).insertCheckin('owner', {
      mealId,
      energy: 'okay',
      stomach: 'fine',
      symptom: null,
    });
    expect(calls).toContainEqual([
      'insert',
      expect.objectContaining({ question_type: null, answer_id: null, question_source: null }),
    ]);
  });
  it('finds the last pre_existing check-in scoped to the user', async () => {
    const { db, calls } = fakeDb({ created_at: '2026-10-30T00:00:00Z' });
    expect(await createFeelRepository(db).findLastPreExistingAt('owner')).toBe(
      '2026-10-30T00:00:00Z',
    );
    expect(calls).toContainEqual(['eq', 'user_id', 'owner']);
    expect(calls).toContainEqual(['eq', 'question_type', 'pre_existing']);
    expect(await createFeelRepository(fakeDb(null).db).findLastPreExistingAt('owner')).toBeNull();
  });
});

// The answer is private to its owner like experiments (decision 0006): buddy code never sees it.
const modules = join(__dirname, '..', '..');
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === '__tests__' ? [] : sources(p);
    return p.endsWith('.ts') ? [p] : [];
  });
}
describe('privacy', () => {
  it('buddy code never mentions the pre_existing answer or its columns', () => {
    for (const file of sources(join(modules, 'streaks'))) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(
        /pre_existing|answer_id|answerId|question_type|questionType|feel_checkins/,
      );
    }
  });
  it('no other module mentions the pre_existing columns', () => {
    for (const mod of readdirSync(modules).filter(
      (n) => n !== 'feel' && statSync(join(modules, n)).isDirectory(),
    )) {
      for (const file of sources(join(modules, mod))) {
        expect(readFileSync(file, 'utf8'), file).not.toMatch(
          /pre_existing|answer_id|question_type/,
        );
      }
    }
  });
  it('the feel module never logs the answer', () => {
    for (const file of sources(join(modules, 'feel'))) {
      for (const call of readFileSync(file, 'utf8').matchAll(/logger\.\w+\([^;]*\);/g))
        expect(call[0], file).not.toMatch(/answer|pre_existing|questionType|body|input/i);
    }
  });
});
