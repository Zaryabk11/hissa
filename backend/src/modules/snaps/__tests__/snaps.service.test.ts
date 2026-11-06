import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';
import {
  ConflictError,
  NotFoundError,
  TooManyRequestsError,
  ValidationError,
} from '../../../shared/errors';
import { logger } from '../../../shared/logger';
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
    const { service, recipients } = setup({ meals, friends: [me, cat] });
    // the fake friend list is [me, cat] for every sender
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
    const { service } = setup({ friends: [me] });
    await service.send(bob, { mealId: 'm1', image: await photo() }, NOW);
    expect((await service.inbox(me, new Date(NOW.getTime() + 24 * HOUR - 1))).items).toHaveLength(
      1,
    );
    expect((await service.inbox(me, new Date(NOW.getTime() + 24 * HOUR))).items).toHaveLength(0);
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
