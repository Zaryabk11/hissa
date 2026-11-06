import sharp from 'sharp';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { startJobs } from '../../../shared/jobs';
import {
  ConflictError,
  NotFoundError,
  TooManyRequestsError,
  ValidationError,
} from '../../../shared/errors';
import { logger } from '../../../shared/logger';
import { createSnapsModule } from '..';
import { createSnapsJob } from '../snaps.sweeper';
import { bob, cat, dan, HOUR, me, NOW, photo, setup } from './snaps.fake';

describe('snaps service: send', () => {
  it('stores one JPEG at <snapId>.jpg and one row per friend expiring in 24 h', async () => {
    const { service, storage, snaps, recipients, objects } = setup();
    const out = await service.send(me, { mealId: 'm1', image: await photo() }, NOW);
    expect(out.recipients).toEqual({ friends: 2 });
    expect(out.expiresAt).toBe(new Date(NOW.getTime() + 24 * HOUR).toISOString());
    expect(snaps).toHaveLength(1);
    expect(out.id).toBe(snaps[0]?.id);
    expect(snaps[0]?.object_path).toBe(`${out.id}.jpg`);
    expect(storage.put).toHaveBeenCalledTimes(1);
    expect([...objects.keys()]).toEqual([`${out.id}.jpg`]);
    expect(recipients.map((r) => r.recipient_id)).toEqual([bob, cat]);
    expect(recipients.every((r) => r.expires_at === out.expiresAt && r.opened_at === null)).toBe(
      true,
    );
  });

  it('with no friends stores nothing and writes no rows', async () => {
    const { service, storage, snaps, recipients } = setup({ friends: [] });
    const out = await service.send(me, { mealId: 'm1', image: await photo() }, NOW);
    expect(out).toEqual({ id: null, expiresAt: null, recipients: { friends: 0 } });
    expect(storage.put).not.toHaveBeenCalled();
    expect(snaps).toHaveLength(0);
    expect(recipients).toHaveLength(0);
  });

  it('rejects a second snap for the same meal with a conflict', async () => {
    const { service } = setup();
    await service.send(me, { mealId: 'm1', image: await photo() }, NOW);
    await expect(service.send(me, { mealId: 'm1', image: await photo() }, NOW)).rejects.toThrow(
      ConflictError,
    );
  });

  it('rejects the 13th snap in a PKT day, and counts from the new day after 00:00 PKT', async () => {
    const meals = Object.fromEntries(
      Array.from({ length: 14 }, (_, i) => [`m${i}`, NOW.toISOString()]),
    );
    const { service, snaps } = setup({ meals });
    const image = await photo();
    for (let i = 0; i < 12; i++) await service.send(me, { mealId: `m${i}`, image }, NOW);
    await expect(service.send(me, { mealId: 'm12', image }, NOW)).rejects.toThrow(
      TooManyRequestsError,
    );
    expect(snaps).toHaveLength(12);
    // 00:01 PKT on 2026-11-07 is 19:01 UTC on 2026-11-06.
    const next = new Date('2026-11-06T19:01:00Z');
    meals.m12 = next.toISOString();
    await expect(service.send(me, { mealId: 'm12', image }, next)).resolves.toMatchObject({
      recipients: { friends: 2 },
    });
  });

  it("404s when the meal is not the caller's", async () => {
    const { service } = setup();
    await expect(service.send(me, { mealId: 'nope', image: await photo() }, NOW)).rejects.toThrow(
      NotFoundError,
    );
  });

  it('400s when the meal was eaten 31 minutes ago, accepts 29', async () => {
    const at = (min: number) => new Date(NOW.getTime() - min * 60_000).toISOString();
    const { service } = setup({ meals: { old: at(31), ok: at(29) } });
    const image = await photo();
    await expect(service.send(me, { mealId: 'old', image }, NOW)).rejects.toThrow(ValidationError);
    await expect(service.send(me, { mealId: 'ok', image }, NOW)).resolves.toBeDefined();
  });

  it('strips GPS and all EXIF from the stored bytes', async () => {
    const tagged = await sharp({
      create: { width: 64, height: 48, channels: 3, background: '#c33' },
    })
      .jpeg()
      .withExif({
        IFD0: { Copyright: 'x' },
        IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '24/1 51/1 0/1' },
      })
      .toBuffer();
    expect((await sharp(tagged).metadata()).exif).toBeDefined();
    const { service, objects } = setup();
    await service.send(me, { mealId: 'm1', image: tagged.toString('base64') }, NOW);
    const meta = await sharp([...objects.values()][0]).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.format).toBe('jpeg');
  });

  it.each(['png', 'webp'] as const)('stores a %s input as JPEG', async (format) => {
    const { service, objects } = setup();
    await service.send(me, { mealId: 'm1', image: await photo(format) }, NOW);
    expect((await sharp([...objects.values()][0]).metadata()).format).toBe('jpeg');
  });

  it('freezes the recipient list at send time', async () => {
    const { service, recipients, friendList } = setup();
    await service.send(me, { mealId: 'm1', image: await photo() }, NOW);
    friendList.push(dan);
    expect(recipients.map((r) => r.recipient_id)).toEqual([bob, cat]);
  });

  it('on a lost insert race removes the stored object and conflicts', async () => {
    const { service, repository, storage, objects } = setup();
    repository.snapForMeal.mockResolvedValueOnce(null);
    repository.insertSnap.mockRejectedValueOnce({ code: '23505' });
    await expect(service.send(me, { mealId: 'm1', image: await photo() }, NOW)).rejects.toThrow(
      ConflictError,
    );
    expect(storage.put).toHaveBeenCalledTimes(1);
    expect(storage.remove).toHaveBeenCalledTimes(1);
    expect(objects.size).toBe(0);
  });

  it('when the recipients insert fails removes the object and the row, so a retry succeeds', async () => {
    const { service, repository, snaps, recipients, objects } = setup();
    repository.insertRecipients.mockRejectedValueOnce(new Error('network'));
    await expect(service.send(me, { mealId: 'm1', image: await photo() }, NOW)).rejects.toThrow(
      'network',
    );
    expect(objects.size).toBe(0);
    expect(snaps).toHaveLength(0);
    const again = await service.send(me, { mealId: 'm1', image: await photo() }, NOW);
    expect(again.id).toEqual(expect.any(String));
    expect(snaps).toHaveLength(1);
    expect(recipients).toHaveLength(2);
  });

  it('rethrows the original error when the cleanup delete also fails, and logs it', async () => {
    const warn = vi.spyOn(logger, 'warn');
    const { service, repository } = setup();
    repository.insertRecipients.mockRejectedValueOnce(new Error('network'));
    repository.deleteSnap.mockRejectedValueOnce(new Error('db down'));
    await expect(service.send(me, { mealId: 'm1', image: await photo() }, NOW)).rejects.toThrow(
      'network',
    );
    expect(warn).toHaveBeenCalledWith('snap.delete_failed', expect.anything());
    warn.mockRestore();
  });

  it('logs snap.delete_failed when removing the object fails during cleanup', async () => {
    const warn = vi.spyOn(logger, 'warn');
    const { service, repository, storage } = setup();
    repository.insertRecipients.mockRejectedValueOnce(new Error('network'));
    vi.mocked(storage.remove).mockRejectedValueOnce(new Error('storage down'));
    await expect(service.send(me, { mealId: 'm1', image: await photo() }, NOW)).rejects.toThrow(
      'network',
    );
    expect(warn).toHaveBeenCalledWith(
      'snap.delete_failed',
      expect.objectContaining({ message: 'storage down' }),
    );
    warn.mockRestore();
  });

  it('never logs image data', async () => {
    const spies = (['info', 'warn', 'error'] as const).map((l) => vi.spyOn(logger, l));
    const { service } = setup();
    const image = await photo();
    await service.send(me, { mealId: 'm1', image }, NOW);
    const logged = JSON.stringify(spies.flatMap((s) => s.mock.calls));
    expect(logged).toContain('snap.created');
    expect(logged).not.toContain(image.slice(0, 40));
    spies.forEach((s) => s.mockRestore());
  });
});

describe('snaps service: inbox', () => {
  it('lists only my unopened live snaps with the sender card, never bytes, and is repeatable', async () => {
    const meals = { m1: NOW.toISOString(), m2: NOW.toISOString() };
    const { service, recipients } = setup({ meals, friends: [me, bob, cat] });
    const image = await photo();
    await service.send(bob, { mealId: 'm1', image }, NOW);
    await service.send(cat, { mealId: 'm2', image }, NOW);
    const first = await service.inbox(me, NOW);
    expect(first.items.map((i) => i.sender.userId).sort()).toEqual([bob, cat]);
    expect(first.items[0]).toEqual({
      id: expect.any(String),
      sender: expect.objectContaining({ username: expect.any(String) }),
      sentAt: NOW.toISOString(),
      expiresAt: new Date(NOW.getTime() + 24 * HOUR).toISOString(),
    });
    expect(await service.inbox(me, NOW)).toEqual(first);
    expect(JSON.stringify(first)).not.toMatch(/image|base64|object_path/);

    // opened rows are omitted, other users' rows are never mine
    const mine = recipients.find((r) => r.recipient_id === me && r.snap_id === first.items[0]?.id);
    if (mine) mine.opened_at = NOW.toISOString();
    expect((await service.inbox(me, NOW)).items).toHaveLength(1);
    expect((await service.inbox(dan, NOW)).items).toHaveLength(0);
  });

  it('omits expired rows', async () => {
    const { service } = setup({ friends: [me, bob] });
    await service.send(bob, { mealId: 'm1', image: await photo() }, NOW);
    expect((await service.inbox(me, new Date(NOW.getTime() + 24 * HOUR - 1))).items).toHaveLength(
      1,
    );
    expect((await service.inbox(me, new Date(NOW.getTime() + 24 * HOUR))).items).toHaveLength(0);
  });
});

describe('snaps service: inbox after unfriending', () => {
  it("does not list a snap from someone who is no longer a friend", async () => {
    const { service, friendList } = setup();
    await service.send(me, { mealId: 'm1', image: await photo() }, NOW);
    expect((await service.inbox(bob, NOW)).items).toHaveLength(1);
    expect((await service.inbox(cat, NOW)).items).toHaveLength(1);
    friendList.splice(friendList.indexOf(bob), 1); // bob unfriends me
    expect((await service.inbox(bob, NOW)).items).toHaveLength(0);
    expect((await service.inbox(cat, NOW)).items).toHaveLength(1);
  });
});

describe('snaps service: unsend', () => {
  it('404s for anyone but the sender', async () => {
    const { service, storage } = setup();
    const { id } = await service.send(me, { mealId: 'm1', image: await photo() }, NOW);
    await expect(service.unsend(bob, id as string)).rejects.toThrow(NotFoundError);
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it('removes the object, then marks deleted and drops recipients', async () => {
    const { service, repository, storage, snaps, recipients, objects } = setup();
    const { id } = await service.send(me, { mealId: 'm1', image: await photo() }, NOW);
    await service.unsend(me, id as string);
    expect(objects.size).toBe(0);
    expect(snaps[0]?.deleted_at).not.toBeNull();
    expect(recipients).toHaveLength(0);
    const order = (f: { mock: { invocationCallOrder: number[] } }) =>
      f.mock.invocationCallOrder[0] ?? 0;
    expect(order(storage.remove as never)).toBeLessThan(order(repository.markDeleted));
    expect(order(repository.markDeleted)).toBeLessThan(order(repository.deleteRecipients));
    await expect(service.unsend(me, id as string)).rejects.toThrow(NotFoundError);
  });

  it('keeps the opener row so they can still report (metadata only), drops unopened rows', async () => {
    const { service, recipients, reports, reportObjects } = setup();
    const { id } = await service.send(me, { mealId: 'm1', image: await photo() }, NOW);
    await service.open(bob, id as string, NOW);
    await service.unsend(me, id as string, NOW);
    expect(recipients.map((r) => r.recipient_id)).toEqual([bob]);
    await service.report(bob, id as string, 'spam', NOW);
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ evidence_path: null, evidence_expires_at: null });
    expect(reportObjects.size).toBe(0);
    await expect(service.report(cat, id as string, 'spam', NOW)).rejects.toThrow(NotFoundError);
  });

  it('leaves the rows intact when the storage remove fails', async () => {
    const { service, storage, snaps, recipients } = setup();
    const { id } = await service.send(me, { mealId: 'm1', image: await photo() }, NOW);
    vi.mocked(storage.remove).mockRejectedValueOnce(new Error('storage down'));
    await expect(service.unsend(me, id as string)).rejects.toThrow('storage down');
    expect(snaps[0]?.deleted_at).toBeNull();
    expect(recipients).toHaveLength(2);
  });
});

describe('snaps service: open', () => {
  // me sends to bob and cat; returns the snap id and the stored bytes
  async function sent(opts?: Parameters<typeof setup>[0]) {
    const s = setup(opts);
    const { id } = await s.service.send(me, { mealId: 'm1', image: await photo() }, NOW);
    const bytes = [...s.objects.values()][0] as Buffer;
    return { ...s, id: id as string, bytes };
  }
  const openedAt = (rs: { recipient_id: string; opened_at: string | null }[], who: string) =>
    rs.find((r) => r.recipient_id === who)?.opened_at;

  it('returns the stored bytes as base64 once, logs ids only, and keeps the object', async () => {
    const spies = (['info', 'warn', 'error'] as const).map((l) => vi.spyOn(logger, l));
    const { service, id, bytes, recipients, objects, storage } = await sent();
    const out = await service.open(bob, id, NOW);
    expect(out).toEqual({
      image: bytes.toString('base64'),
      mimeType: 'image/jpeg',
      sender: expect.objectContaining({ userId: me }),
      sentAt: NOW.toISOString(),
      expiresAt: new Date(NOW.getTime() + 24 * HOUR).toISOString(),
    });
    expect(openedAt(recipients, bob)).toBe(NOW.toISOString());
    expect(openedAt(recipients, cat)).toBeNull();
    expect(objects.size).toBe(1);
    expect(storage.remove).not.toHaveBeenCalled();
    const calls = spies.flatMap((s) => s.mock.calls);
    expect(calls).toContainEqual(['snap.opened', { snapId: id, viewerId: bob }]);
    expect(JSON.stringify(calls)).not.toContain(out.image.slice(0, 40));
    spies.forEach((s) => s.mockRestore());
    await expect(service.open(bob, id, NOW)).rejects.toThrow(NotFoundError);
  });

  it('gives the same 404 to the sender, a stranger, an unknown id, an expired row, a deleted snap and an unfriended sender', async () => {
    const { service, id, recipients, snaps, friendList } = await sent();
    const late = new Date(NOW.getTime() + 24 * HOUR);
    const attempts: [string, string, Date][] = [
      [me, id, NOW],
      [dan, id, NOW],
      [bob, '00000000-0000-0000-0000-000000000000', NOW],
      [bob, id, late],
    ];
    for (const [who, snapId, at] of attempts)
      await expect(service.open(who, snapId, at)).rejects.toThrow(NotFoundError);

    friendList.splice(friendList.indexOf(bob), 1); // bob unfriends me
    await expect(service.open(bob, id, NOW)).rejects.toThrow(NotFoundError);
    (snaps[0] as { deleted_at: string | null }).deleted_at = NOW.toISOString();
    await expect(service.open(cat, id, NOW)).rejects.toThrow(NotFoundError);
    expect(recipients.every((r) => r.opened_at === null)).toBe(true);
  });

  it('404s when the stored object is missing, without claiming', async () => {
    const { service, id, recipients, objects } = await sent();
    objects.clear();
    await expect(service.open(bob, id, NOW)).rejects.toThrow(NotFoundError);
    expect(openedAt(recipients, bob)).toBeNull();
  });

  it('surfaces a storage error, leaves the snap unopened, and a retry succeeds', async () => {
    const { service, storage, repository, id, recipients } = await sent();
    vi.mocked(storage.get).mockRejectedValueOnce(new Error('storage down'));
    await expect(service.open(bob, id, NOW)).rejects.toThrow('storage down');
    expect(repository.claimOpen).not.toHaveBeenCalled();
    expect(openedAt(recipients, bob)).toBeNull();
    await expect(service.open(bob, id, NOW)).resolves.toMatchObject({ mimeType: 'image/jpeg' });
  });

  it('still opens after the meal was deleted (meal_id null)', async () => {
    const { service, id, snaps } = await sent();
    (snaps[0] as { meal_id: string | null }).meal_id = null;
    await expect(service.open(bob, id, NOW)).resolves.toMatchObject({ mimeType: 'image/jpeg' });
  });
});

describe('snaps service: report', () => {
  const DAY = 24 * HOUR;
  // me sends to bob and cat; bob opens it
  async function opened() {
    const s = setup();
    const { id } = await s.service.send(me, { mealId: 'm1', image: await photo() }, NOW);
    await s.service.open(bob, id as string, NOW);
    return { ...s, id: id as string };
  }

  it('copies the photo, keeps it 30 days, logs ids only and leaves the original', async () => {
    const spies = (['info', 'warn', 'error'] as const).map((l) => vi.spyOn(logger, l));
    const { service, id, reports, reportObjects, objects, storage } = await opened();
    await service.report(bob, id, 'harassment', NOW);
    expect(reports).toHaveLength(1);
    const r = reports[0];
    expect(r).toMatchObject({
      reporter_id: bob,
      target_id: me,
      snap_id: id,
      reason: 'harassment',
      evidence_path: `${r?.id}.jpg`,
      evidence_expires_at: new Date(NOW.getTime() + 30 * DAY).toISOString(),
    });
    expect(storage.copyToReports).toHaveBeenCalledWith(`${id}.jpg`, `${r?.id}.jpg`);
    expect([...reportObjects.keys()]).toEqual([`${r?.id}.jpg`]);
    expect([...objects.keys()]).toEqual([`${id}.jpg`]);
    expect(storage.remove).not.toHaveBeenCalled();
    const calls = spies.flatMap((s) => s.mock.calls);
    expect(calls).toContainEqual([
      'snap.reported',
      { snapId: id, reporterId: bob, evidenceKept: true },
    ]);
    spies.forEach((s) => s.mockRestore());
  });

  it('records metadata only when the object is already gone', async () => {
    const spies = (['info', 'warn', 'error'] as const).map((l) => vi.spyOn(logger, l));
    const { service, id, reports, objects, reportObjects } = await opened();
    objects.clear();
    await service.report(bob, id, 'spam', NOW);
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ evidence_path: null, evidence_expires_at: null });
    expect(reportObjects.size).toBe(0);
    expect(spies.flatMap((s) => s.mock.calls)).toContainEqual([
      'snap.reported',
      { snapId: id, reporterId: bob, evidenceKept: false },
    ]);
    spies.forEach((s) => s.mockRestore());
  });

  it('404s for a recipient who never opened it, a stranger, the sender and an unknown id', async () => {
    const { service, id, reports } = await opened();
    for (const who of [cat, dan, me])
      await expect(service.report(who, id, 'spam', NOW)).rejects.toThrow(NotFoundError);
    await expect(
      service.report(bob, '00000000-0000-0000-0000-000000000000', 'spam', NOW),
    ).rejects.toThrow(NotFoundError);
    expect(reports).toHaveLength(0);
  });

  it('a repeat report is a no-op: one row, one stored copy', async () => {
    const { service, id, reports, reportObjects } = await opened();
    await service.report(bob, id, 'spam', NOW);
    await expect(service.report(bob, id, 'other', NOW)).resolves.toBeUndefined();
    expect(reports).toHaveLength(1);
    expect(reports[0]?.reason).toBe('spam');
    expect(reportObjects.size).toBe(1);
  });

  it('removes the copy and leaves no row when the insert fails', async () => {
    const { service, id, repository, reports, reportObjects } = await opened();
    repository.insertReport.mockRejectedValueOnce(new Error('db down'));
    await expect(service.report(bob, id, 'spam', NOW)).rejects.toThrow('db down');
    expect(reports).toHaveLength(0);
    expect(reportObjects.size).toBe(0);
  });
});

describe('snaps service: report cleanup', () => {
  it('logs snap.delete_failed when removing its own copy fails', async () => {
    const warn = vi.spyOn(logger, 'warn');
    const s = setup();
    const { id } = await s.service.send(me, { mealId: 'm1', image: await photo() }, NOW);
    await s.service.open(bob, id as string, NOW);
    s.repository.insertReport.mockRejectedValueOnce(new Error('db down'));
    vi.mocked(s.storage.removeReports).mockRejectedValueOnce(new Error('storage down'));
    await expect(s.service.report(bob, id as string, 'spam', NOW)).rejects.toThrow('db down');
    expect(warn).toHaveBeenCalledWith(
      'snap.delete_failed',
      expect.objectContaining({ message: 'storage down' }),
    );
    warn.mockRestore();
  });
});

describe('snaps service: sweep', () => {
  const MIN = 60_000;
  const DAY = 24 * HOUR;
  const at = (ms: number) => new Date(NOW.getTime() + ms);
  afterEach(() => vi.restoreAllMocks());

  // me sends to bob and cat at NOW
  async function sent() {
    const s = setup();
    const { id } = await s.service.send(me, { mealId: 'm1', image: await photo() }, NOW);
    return { ...s, id: id as string };
  }

  it('removes an unopened snap at 24 h and marks it deleted, not a moment before', async () => {
    const info = vi.spyOn(logger, 'info');
    const { service, id, snaps, objects } = await sent();
    expect(await service.sweep(at(24 * HOUR - 1))).toEqual({ deleted: 0, failed: 0 });
    expect(objects.size).toBe(1);
    expect(await service.sweep(at(24 * HOUR))).toEqual({ deleted: 1, failed: 0 });
    expect(objects.size).toBe(0);
    expect(snaps[0]?.deleted_at).toBe(at(24 * HOUR).toISOString());
    expect(info).toHaveBeenCalledWith('snap.object_deleted', { snapId: id, reason: 'expired' });
    expect(info).toHaveBeenCalledWith('snap.sweep', { deleted: 1, failed: 0 });
  });

  it('removes the object 10 minutes after the last recipient opened it', async () => {
    const info = vi.spyOn(logger, 'info');
    const { service, id, objects, snaps } = await sent();
    await service.open(bob, id, at(HOUR));
    await service.open(cat, id, at(2 * HOUR));
    expect(await service.sweep(at(2 * HOUR + 9 * MIN))).toEqual({ deleted: 0, failed: 0 });
    expect(objects.size).toBe(1);
    expect(await service.sweep(at(2 * HOUR + 11 * MIN))).toEqual({ deleted: 1, failed: 0 });
    expect(objects.size).toBe(0);
    expect(snaps[0]?.deleted_at).not.toBeNull();
    expect(info).toHaveBeenCalledWith('snap.object_deleted', { snapId: id, reason: 'opened' });
  });

  it('keeps a snap while one recipient has not opened it and it has not expired', async () => {
    const { service, id, objects, snaps } = await sent();
    await service.open(bob, id, NOW);
    expect(await service.sweep(at(23 * HOUR))).toEqual({ deleted: 0, failed: 0 });
    expect(objects.size).toBe(1);
    expect(snaps[0]?.deleted_at).toBeNull();
  });

  it('a failed remove counts as failed, leaves deleted_at null, and the next sweep deletes', async () => {
    const warn = vi.spyOn(logger, 'warn');
    const { service, storage, id, snaps, objects } = await sent();
    vi.mocked(storage.remove).mockRejectedValueOnce(new Error('storage down'));
    expect(await service.sweep(at(DAY))).toEqual({ deleted: 0, failed: 1 });
    expect(snaps[0]?.deleted_at).toBeNull();
    expect(objects.size).toBe(1);
    expect(warn).toHaveBeenCalledWith(
      'snap.delete_failed',
      expect.objectContaining({ snapId: id, message: 'storage down' }),
    );
    expect(await service.sweep(at(DAY + 5 * MIN))).toEqual({ deleted: 1, failed: 0 });
    expect(objects.size).toBe(0);
    expect(snaps[0]?.deleted_at).not.toBeNull();
  });

  it('a failed markDeleted after the remove is retried next sweep', async () => {
    const { service, repository, snaps } = await sent();
    repository.markDeleted.mockRejectedValueOnce(new Error('db down'));
    expect(await service.sweep(at(DAY))).toEqual({ deleted: 0, failed: 1 });
    expect(snaps[0]?.deleted_at).toBeNull();
    expect(await service.sweep(at(DAY + 5 * MIN))).toEqual({ deleted: 1, failed: 0 });
    expect(snaps[0]?.deleted_at).not.toBeNull();
  });

  it('open 404s after expiry even if the sweep never ran', async () => {
    const { service, id, objects } = await sent();
    await expect(service.open(bob, id, at(DAY))).rejects.toThrow(NotFoundError);
    expect(objects.size).toBe(1);
  });

  it('removes bucket objects older than 25 h with no live row, keeps younger ones and live rows', async () => {
    const { service, id, objects, objectAt } = await sent();
    const orphan = '33333333-3333-4333-8333-333333333333';
    const young = '44444444-4444-4444-8444-444444444444';
    const sweepAt = at(HOUR);
    objects.set(`${orphan}.jpg`, Buffer.from('x'));
    objectAt.set(`${orphan}.jpg`, new Date(sweepAt.getTime() - 26 * HOUR).toISOString());
    objects.set(`${young}.jpg`, Buffer.from('y'));
    objectAt.set(`${young}.jpg`, new Date(sweepAt.getTime() - 20 * HOUR).toISOString());
    objects.set('junk.txt', Buffer.from('z'));
    objectAt.set('junk.txt', new Date(sweepAt.getTime() - 30 * HOUR).toISOString());
    // a live row protects its object even if the listing says it is old
    objectAt.set(`${id}.jpg`, new Date(sweepAt.getTime() - 26 * HOUR).toISOString());
    expect(await service.sweep(sweepAt)).toEqual({ deleted: 2, failed: 0 });
    expect([...objects.keys()].sort()).toEqual([`${id}.jpg`, `${young}.jpg`].sort());
  });

  it('removes evidence past 30 days and clears evidence_path', async () => {
    const { service, id, reports, reportObjects } = await sent();
    await service.open(bob, id, NOW);
    await service.report(bob, id, 'spam', NOW);
    await service.sweep(at(29 * DAY));
    expect(reportObjects.size).toBe(1);
    expect(reports[0]?.evidence_path).not.toBeNull();
    const out = await service.sweep(at(30 * DAY));
    expect(out).toEqual({ deleted: 1, failed: 0 });
    expect(reportObjects.size).toBe(0);
    expect(reports[0]?.evidence_path).toBeNull();
  });

  it('removes snap-reports objects older than 31 days that no report references', async () => {
    const { service, reports, reportObjects, reportAt } = await sent();
    const sweepAt = at(HOUR);
    const put = (name: string, ageDays: number) => {
      reportObjects.set(name, Buffer.from(name));
      reportAt.set(name, new Date(sweepAt.getTime() - ageDays * DAY).toISOString());
    };
    put('orphan.jpg', 32);
    put('young.jpg', 30);
    put('kept.jpg', 32);
    reports.push({
      id: 'r1',
      reporter_id: bob,
      target_id: me,
      snap_id: 's1',
      reason: 'spam',
      created_at: NOW.toISOString(),
      evidence_path: 'kept.jpg',
      evidence_expires_at: at(DAY).toISOString(),
    });
    expect(await service.sweep(sweepAt)).toEqual({ deleted: 1, failed: 0 });
    expect([...reportObjects.keys()].sort()).toEqual(['kept.jpg', 'young.jpg']);
  });

  it('hard-deletes snap rows 7 days after expiry', async () => {
    const { service, snaps, recipients } = await sent();
    await service.sweep(at(DAY));
    await service.sweep(at(DAY + 6 * DAY));
    expect(snaps).toHaveLength(1);
    await service.sweep(at(DAY + 8 * DAY));
    expect(snaps).toHaveLength(0);
    expect(recipients).toHaveLength(0);
  });

  it('sweeping twice is a no-op', async () => {
    const { service, storage } = await sent();
    expect(await service.sweep(at(DAY))).toEqual({ deleted: 1, failed: 0 });
    vi.mocked(storage.remove).mockClear();
    expect(await service.sweep(at(DAY))).toEqual({ deleted: 0, failed: 0 });
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it('a failing stage does not stop the others', async () => {
    const { service, storage, objects } = await sent();
    vi.mocked(storage.listOlderThan).mockRejectedValueOnce(new Error('list down'));
    expect(await service.sweep(at(DAY))).toEqual({ deleted: 1, failed: 1 });
    expect(objects.size).toBe(0);
  });

  it('fails soft when the buckets are missing: resolves with failed > 0', async () => {
    vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const { service, storage } = await sent();
    for (const f of Object.values(storage))
      vi.mocked(f).mockRejectedValue(new Error('bucket not found'));
    const result = await service.sweep(at(DAY));
    expect(result.failed).toBeGreaterThan(0);
    vi.restoreAllMocks();
  });

  it('warns once when a stage keeps failing the same way, then drops to debug', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const debug = vi.spyOn(logger, 'debug').mockImplementation(() => {});
    const { service, storage } = await sent();
    vi.mocked(storage.listOlderThan).mockRejectedValue(new Error('bucket not found'));
    const stageWarns = () =>
      warn.mock.calls.filter(([, meta]) => (meta as { stage?: string }).stage === 'orphans');
    for (let i = 1; i <= 3; i++) expect((await service.sweep(at(i * 5 * MIN))).failed).toBe(1);
    expect(stageWarns()).toHaveLength(1);
    expect(debug).toHaveBeenCalledWith(
      'snap.delete_failed',
      expect.objectContaining({ stage: 'orphans', message: 'bucket not found' }),
    );
    expect(debug).toHaveBeenCalledTimes(2);
    // a different failure warns again, and so does the same one after a good run
    vi.mocked(storage.listOlderThan).mockRejectedValue(new Error('timeout'));
    await service.sweep(at(20 * MIN));
    expect(stageWarns()).toHaveLength(2);
    vi.mocked(storage.listOlderThan).mockResolvedValueOnce([]);
    await service.sweep(at(25 * MIN));
    await service.sweep(at(30 * MIN));
    expect(stageWarns()).toHaveLength(3);
    vi.restoreAllMocks();
  });

  it('never logs bytes or who opened the snap', async () => {
    const spies = (['info', 'warn', 'error'] as const).map((l) => vi.spyOn(logger, l));
    const { service, id, objects } = await sent();
    const b64 = ([...objects.values()][0] as Buffer).toString('base64');
    await service.open(bob, id, NOW);
    await service.open(cat, id, NOW);
    spies.forEach((sp) => sp.mockClear());
    await service.sweep(at(11 * MIN));
    const logged = JSON.stringify(spies.flatMap((sp) => sp.mock.calls));
    expect(logged).toContain('snap.object_deleted');
    expect(logged).not.toContain(b64.slice(0, 40));
    expect(logged).not.toContain(bob);
    expect(logged).not.toContain(cat);
  });
});

describe('snaps sweep job', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('runs sweep every 5 minutes and survives a throwing sweep', async () => {
    vi.useFakeTimers();
    vi.spyOn(logger, 'error').mockImplementation(() => {});
    const sweep = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue({ deleted: 0, failed: 0 });
    const job = createSnapsJob({ sweep });
    expect(job).toMatchObject({ name: 'snaps.sweep', everyMs: 300_000 });
    const stop = startJobs([job]);
    await vi.advanceTimersByTimeAsync(0);
    expect(sweep).toHaveBeenCalledWith(expect.any(Date));
    await vi.advanceTimersByTimeAsync(300_000);
    expect(sweep).toHaveBeenCalledTimes(2);
    stop();
  });

  it('createSnapsModule always returns the sweep job; the registry gates only the router', () => {
    const jobs = createSnapsModule({
      db: {} as never,
      friends: {} as never,
      meals: {} as never,
      profiles: {} as never,
    }).jobs.map((j) => j.name);
    expect(jobs).toEqual(['snaps.sweep']);
  });
});
