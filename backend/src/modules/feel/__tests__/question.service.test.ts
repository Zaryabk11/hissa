import { describe, expect, it, vi } from 'vitest';
import { createFeelService } from '../feel.service';
import type { FeelRepository } from '../feel.repository';
import type { Observation } from '../feel.types';
import { questionBank } from '../question-bank';

const now = new Date('2026-11-02T12:00:00Z');
const mealId = '11111111-1111-4111-8111-111111111111';
const ids = ['bloated', 'upset', 'other', 'not_sure'];
const good = { text: 'Which description best matches how your stomach feels?', optionIds: ids };
const fallback = {
  source: 'fallback',
  text: questionBank.symptom_detail.text,
  options: questionBank.symptom_detail.options,
};

function setup(output: unknown = good, age = 120, observations: Observation[] = []) {
  const draft = vi.fn().mockResolvedValue(output);
  const repository = {
    async findMeal(userId: string, id: string) {
      return userId === 'owner' && id === mealId
        ? {
            id,
            eatenAt: new Date(+now - age * 60000).toISOString(),
            checkedIn: false,
            dishes: ['Raita'],
          }
        : null;
    },
    listObservations: vi.fn(async () => observations),
  } as unknown as FeelRepository;
  return {
    service: createFeelService({ repository, questionClient: { draft } }),
    draft,
    repository,
  };
}

function obs(i: number, delayHours: number, slug = 'raita'): Observation {
  const eaten = new Date(+now - (i + 3) * 86_400_000);
  return {
    userId: 'owner',
    mealId: `m${i}`,
    eatenAt: eaten.toISOString(),
    checkedInAt: new Date(+eaten + delayHours * 3_600_000).toISOString(),
    dishes: [{ slug, category: 'other' }],
    energy: 'okay',
    stomach: slug === 'raita' ? 'heavy' : 'fine',
    symptom: null,
    answerId: null,
  };
}

describe('getQuestion', () => {
  it('uses valid wording with canonical option ids, labels and order', async () => {
    const q = await setup({ ...good, optionIds: [...ids].reverse() }).service.getQuestion(
      'owner',
      mealId,
      now,
    );
    expect(q).toEqual({
      mealId,
      intent: 'symptom_detail',
      text: good.text,
      options: questionBank.symptom_detail.options,
      source: 'gemini',
    });
    expect(q.options.map((o) => o.id)).toEqual(ids);
  });

  it.each([
    ['extra option', { ...good, optionIds: [...ids, 'extra'] }],
    ['omitted option', { ...good, optionIds: ids.slice(1) }],
    ['duplicate option', { ...good, optionIds: ['bloated', 'bloated', 'upset', 'other'] }],
    ['malformed JSON', 'not json {'],
    ['wrong shape', { text: 42 }],
    ['diagnosis', { ...good, text: 'You are lactose intolerant, which kind of discomfort is it?' }],
    ['unsupported number', { ...good, text: 'After your 3 meals, how does your stomach feel?' }],
    [
      'number word',
      { ...good, text: 'Twice this week your stomach felt heavy, how does it feel?' },
    ],
    ['causal claim', { ...good, text: 'Did the raita cause this stomach discomfort?' }],
    ['restriction', { ...good, text: 'Should you avoid dairy, how does your stomach feel?' }],
    ['medical advice', { ...good, text: 'Ask a doctor: how does your stomach feel?' }],
    ['not a question', { ...good, text: 'Tell me how your stomach feels.' }],
    ['off topic', { ...good, text: 'What is your favourite dessert?' }],
    ['markup', { ...good, text: 'How does your stomach feel? <b>now</b>?' }],
  ])('falls back on %s', async (_name, output) => {
    expect(await setup(output).service.getQuestion('owner', mealId, now)).toMatchObject(fallback);
  });

  it('falls back when the client times out', async () => {
    const { service, draft } = setup();
    draft.mockRejectedValue(new DOMException('timed out', 'TimeoutError'));
    expect(await service.getQuestion('owner', mealId, now)).toMatchObject(fallback);
  });

  it('never drafts for another user, an unknown meal or an ineligible check-in', async () => {
    const { service, draft } = setup();
    await expect(service.getQuestion('other', mealId, now)).rejects.toMatchObject({ status: 404 });
    await expect(
      service.getQuestion('owner', '22222222-2222-4222-8222-222222222222', now),
    ).rejects.toMatchObject({ status: 404 });
    expect(draft).not.toHaveBeenCalled();
    for (const age of [89, 1441]) {
      const s = setup(good, age);
      await expect(s.service.getQuestion('owner', mealId, now)).rejects.toMatchObject({
        status: 400,
      });
      expect(s.draft).not.toHaveBeenCalled();
    }
  });

  it('sends Gemini only an aggregate summary: no ids, slugs or dish names', async () => {
    const { service, draft } = setup(good, 120, [obs(1, 2), obs(2, 2), obs(3, 2, 'dal')]);
    await service.getQuestion('owner', mealId, now);
    const input = draft.mock.calls[0]?.[0];
    expect(input.allowedOptionIds).toEqual(
      questionBank[input.intent as 'symptom_detail' | 'pre_existing'].options.map((o) => o.id),
    );
    expect(input.evidenceSummary).toContain('3 check-ins');
    expect(input.evidenceSummary).not.toMatch(/raita|dal|owner|m1|Raita/);
  });

  it('keeps the 24 hour rule in the service: late check-ins are not evidence', async () => {
    const { service, draft } = setup(good, 120, [obs(1, 2), obs(2, 25), obs(3, 24)]);
    await service.getQuestion('owner', mealId, now);
    expect(draft.mock.calls[0]?.[0].evidenceSummary).toContain('2 check-ins');
  });

  it('asks the generic symptom question when there is no history', async () => {
    const { service } = setup();
    expect((await service.getQuestion('owner', mealId, now)).intent).toBe('symptom_detail');
  });
});
