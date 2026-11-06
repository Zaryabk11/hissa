import { describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '../../../shared/errors';
import { logger } from '../../../shared/logger';
import { bob, cat, me, NOW, photo, setup } from './snaps.fake';

// The fake repository yields between every await, so all parallel calls load the row as unopened
// before any of them claims it. Only the single-winner conditional claim keeps the snap view-once.
describe('snaps open race', () => {
  it('20 parallel opens by one recipient: exactly one wins, the claim lands once, bytes never logged', async () => {
    const spies = (['info', 'warn', 'error'] as const).map((l) => vi.spyOn(logger, l));
    const { service, repository, recipients, objects } = setup();
    const { id } = await service.send(me, { mealId: 'm1', image: await photo() }, NOW);
    const base64 = ([...objects.values()][0] as Buffer).toString('base64');

    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () => service.open(bob, id as string, NOW)),
    );
    const won = results.filter((r) => r.status === 'fulfilled');
    const lost = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(won).toHaveLength(1);
    expect(lost).toHaveLength(19);
    expect(lost.every((r) => r.reason instanceof NotFoundError)).toBe(true);
    // every call got past the read, so the read alone did not stop them
    expect(repository.recipientFor).toHaveBeenCalledTimes(20);
    expect(repository.claimOpen).toHaveBeenCalledTimes(20);
    expect(recipients.filter((r) => r.recipient_id === bob && r.opened_at)).toHaveLength(1);

    const logged = spies.flatMap((s) => s.mock.calls);
    expect(logged.filter((c) => c[0] === 'snap.opened')).toHaveLength(1);
    expect(logged.flat().some((arg) => JSON.stringify(arg ?? null).includes(base64))).toBe(false);
    spies.forEach((s) => s.mockRestore());
  });

  it('two recipients opening together both succeed', async () => {
    const { service, recipients } = setup();
    const { id } = await service.send(me, { mealId: 'm1', image: await photo() }, NOW);
    const results = await Promise.allSettled([
      service.open(bob, id as string, NOW),
      service.open(cat, id as string, NOW),
    ]);
    expect(results.map((r) => r.status)).toEqual(['fulfilled', 'fulfilled']);
    expect(recipients.every((r) => r.opened_at === NOW.toISOString())).toBe(true);
  });
});
