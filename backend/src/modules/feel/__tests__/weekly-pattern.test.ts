import { describe, expect, it } from 'vitest';
import type { MealObservation } from '../feel.types';
import { weeklyPattern } from '../weekly-pattern';

const NOW = new Date('2026-11-03T10:00:00Z'); // 15:00 PKT on 2026-11-03
// PKT window: 2026-10-28 00:00 PKT (= 2026-10-27T19:00Z) up to the end of 2026-11-03 PKT.
const HOUR = 3600_000;

type D = [slug: string, category?: string];
let seq = 0;
function obs(
  dishes: D[],
  o: Partial<Pick<MealObservation, 'energy' | 'stomach' | 'eatenAt'>> = {},
): MealObservation {
  seq += 1;
  return {
    userId: 'u1',
    mealId: `m${seq}`,
    eatenAt: o.eatenAt ?? new Date(NOW.getTime() - ((seq % 40) + 1) * 3 * HOUR).toISOString(),
    dishes: dishes.map(([slug, category = 'other']) => ({ slug, category })),
    energy: o.energy ?? 'okay',
    stomach: o.stomach ?? 'fine',
    symptom: null,
    answerId: null,
  };
}
const heavy = { stomach: 'heavy' } as const;
const RAITA: D = ['raita', 'other'];
const BIRYANI: D = ['biryani', 'rice'];
const DAAL: D = ['daal-chawal', 'lentil'];
const PLAIN: D = ['plain-side', 'other']; // no category pattern can form from it
const filler = (n: number) => Array.from({ length: n }, () => obs([DAAL]));

describe('weeklyPattern', () => {
  it('returns progress, not a claim, with six check-ins', () => {
    const card = weeklyPattern(
      Array.from({ length: 6 }, () => obs([BIRYANI], heavy)),
      NOW,
    );
    expect(card).toMatchObject({
      state: 'insufficient_data',
      checkins: 6,
      needed: 7,
      pattern: null,
    });
    expect(card.label).toContain('6 of 7');
  });

  it('returns no pattern when seven check-ins have fewer than three relevant to any group', () => {
    const card = weeklyPattern(
      [
        obs([['a', 'rice']], heavy),
        obs([['b', 'roti']], heavy),
        obs([['c', 'meat']], heavy),
        obs([['d', 'fried']], heavy),
        obs([['e', 'lentil']], heavy),
        obs([['f', 'sweets']], heavy),
        obs([['g', 'rice']], heavy),
      ],
      NOW,
    );
    expect(card).toMatchObject({ state: 'no_pattern', checkins: 7, pattern: null });
  });

  it('shows a category pattern at exactly 3 relevant with 2 matching (66%)', () => {
    const card = weeklyPattern(
      [obs([BIRYANI], heavy), obs([BIRYANI], heavy), obs([BIRYANI]), ...filler(4)],
      NOW,
    );
    expect(card.state).toBe('pattern');
    expect(card.pattern).toMatchObject({
      kind: 'category',
      subject: 'rice',
      outcome: 'heavy',
      matching: 2,
      relevant: 3,
      patternKey: 'category:rice:heavy',
    });
    expect(card.label).toContain('2 of 3');
    expect(card.label).toMatch(/in your logs/i);
  });

  it('does not show a category pattern below 60%', () => {
    const card = weeklyPattern(
      [obs([BIRYANI], heavy), obs([BIRYANI]), obs([BIRYANI]), obs([BIRYANI]), ...filler(3)],
      NOW,
    );
    expect(card.state).toBe('no_pattern');
  });

  it('supports a good-energy pattern', () => {
    const good = { energy: 'good' } as const;
    const card = weeklyPattern(
      [
        obs([['dal', 'lentil']], good),
        obs([['dal', 'lentil']], good),
        obs([['dal', 'lentil']], good),
        ...Array.from({ length: 4 }, () => obs([BIRYANI])),
      ],
      NOW,
    );
    expect(card.pattern).toMatchObject({
      kind: 'category',
      subject: 'lentil',
      outcome: 'good_energy',
      matching: 3,
      relevant: 3,
    });
    expect(card.label).toContain('good energy');
  });

  it('cannot single out a dish from one mixed meal', () => {
    const card = weeklyPattern(
      [obs([RAITA, BIRYANI], heavy), ...Array.from({ length: 6 }, () => obs([DAAL]))],
      NOW,
    );
    expect(card.state).toBe('no_pattern');
  });

  it('cannot single out one of two dishes that always appear together', () => {
    const card = weeklyPattern(
      [
        ...Array.from({ length: 3 }, () => obs([RAITA, ['pulao', 'other']], heavy)),
        ...Array.from({ length: 4 }, () => obs([DAAL])),
      ],
      NOW,
    );
    expect(card.pattern?.kind).not.toBe('dish');
  });

  it('shows a dish co-occurrence card with exposed and comparison counts', () => {
    const card = weeklyPattern(
      [
        obs([RAITA], heavy),
        obs([RAITA], heavy),
        obs([RAITA], heavy),
        obs([RAITA]),
        obs([DAAL]),
        obs([DAAL]),
        obs([DAAL], heavy),
      ],
      NOW,
    );
    expect(card.state).toBe('pattern');
    expect(card.pattern).toMatchObject({
      kind: 'dish',
      subject: 'raita',
      matching: 3,
      relevant: 4,
      comparison: { matching: 1, total: 3 },
      patternKey: 'dish:raita:heavy',
    });
    expect(card.label).toContain('3 of 4 meals containing raita');
    expect(card.label).toContain('1 of 3');
  });

  it('turns a dish into a question when fewer than 3 comparison meals exist', () => {
    const card = weeklyPattern(
      [...Array.from({ length: 5 }, () => obs([RAITA], heavy)), obs([DAAL]), obs([DAAL])],
      NOW,
    );
    expect(card.state).toBe('question');
    expect(card.pattern).toMatchObject({
      kind: 'dish',
      subject: 'raita',
      comparison: { total: 2 },
    });
    expect(card.label).toContain('still worth exploring');
  });

  it('requires a 25 point gap over the comparison meals', () => {
    // exposed 3/4 = 75%, comparison 2/4 = 50%: gap 25 passes; 2/3 vs 2/3 does not.
    const pass = weeklyPattern(
      [
        obs([RAITA], heavy),
        obs([RAITA], heavy),
        obs([RAITA], heavy),
        obs([RAITA]),
        obs([PLAIN], heavy),
        obs([PLAIN], heavy),
        obs([PLAIN]),
        obs([PLAIN]),
      ],
      NOW,
    );
    expect(pass.pattern).toMatchObject({ kind: 'dish', subject: 'raita' });
    const fail = weeklyPattern(
      [
        obs([RAITA], heavy),
        obs([RAITA], heavy),
        obs([RAITA], heavy),
        obs([RAITA]),
        obs([PLAIN], heavy),
        obs([PLAIN], heavy),
        obs([PLAIN], heavy),
        obs([PLAIN]),
      ],
      NOW,
    );
    expect(fail.state).toBe('question');
  });

  it('uses the last seven PKT days at the boundary', () => {
    const inside = '2026-10-27T19:00:00Z'; // 00:00 PKT on 2026-10-28
    const outside = '2026-10-27T18:59:00Z'; // 23:59 PKT on 2026-10-27
    const seven = (first: string) => [obs([DAAL], { eatenAt: first }), ...filler(6)];
    expect(weeklyPattern(seven(inside), NOW).checkins).toBe(7);
    expect(weeklyPattern(seven(outside), NOW)).toMatchObject({
      checkins: 6,
      state: 'insufficient_data',
    });
    // 23:30 UTC on Oct 27 is 04:30 PKT on Oct 28: inside the window, though a UTC window would drop it.
    expect(weeklyPattern(seven('2026-10-27T23:30:00Z'), NOW).checkins).toBe(7);
    // A check-in after "now" is ignored.
    expect(weeklyPattern(seven('2026-11-03T23:30:00Z'), NOW).checkins).toBe(6);
  });

  it('uses careful copy', () => {
    const cards = [
      weeklyPattern(
        [RAITA, RAITA, RAITA, RAITA].map((d) => obs([d], heavy)).concat(filler(3)),
        NOW,
      ),
      weeklyPattern(
        [...Array.from({ length: 5 }, () => obs([RAITA], heavy)), obs([DAAL]), obs([DAAL])],
        NOW,
      ),
      weeklyPattern(
        [obs([BIRYANI], heavy), obs([BIRYANI], heavy), obs([BIRYANI]), ...filler(4)],
        NOW,
      ),
      weeklyPattern([], NOW),
    ];
    for (const c of cards) {
      expect(c.label).not.toMatch(
        /caus|because|due to|trigger|intoleran|allerg|diagnos|disease|avoid|should|eliminat|cut out|treat|cure/i,
      );
    }
    expect(cards[0]?.label).toContain('meals containing');
  });

  it('carries isSample and a deterministic patternKey', () => {
    const rows = [obs([BIRYANI], heavy), obs([BIRYANI], heavy), obs([BIRYANI]), ...filler(4)];
    const a = weeklyPattern(rows, NOW, true);
    const b = weeklyPattern([...rows].reverse(), new Date(NOW.getTime() + HOUR), false);
    expect(a.isSample).toBe(true);
    expect(b.isSample).toBe(false);
    expect(a.pattern?.patternKey).toBe(b.pattern?.patternKey);
  });
});
