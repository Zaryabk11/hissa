import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';
import {
  ConflictError,
  NotFoundError,
  TooManyRequestsError,
  ValidationError,
} from '../../../shared/errors';
import { logger } from '../../../shared/logger';
import type { PersonCard } from '../../profiles';
import { createSnapsService } from '../snaps.service';
import type { SnapStorage } from '../snaps.types';

const [me, bob, cat, dan] = ['u1', 'u2', 'u3', 'u4'];
const NOW = new Date('2026-11-06T10:00:00Z'); // PKT 15:00 on 2026-11-06
const HOUR = 3_600_000;
const people: PersonCard[] = [me, bob, cat, dan].map((id) => ({
  userId: id,
  username: `name_${id}`,
  displayName: `Name ${id}`,
}));

type SnapRow = {
  id: string;
  sender_id: string;
  meal_id: string;
  object_path: string;
  created_at: string;
  expires_at: string;
  deleted_at: string | null;
};
type RecipientRow = {
  snap_id: string;
  recipient_id: string;
  expires_at: string;
  opened_at: string | null;
};

const photo = (format: 'jpeg' | 'png' | 'webp' = 'jpeg') =>
  sharp({ create: { width: 64, height: 48, channels: 3, background: '#c33' } })
    [format]()
    .toBuffer()
    .then((b) => b.toString('base64'));

function setup({
  friends = [bob, cat],
  meals = { m1: new Date(NOW.getTime() - 5 * 60_000).toISOString() } as Record<string, string>,
}: { friends?: string[]; meals?: Record<string, string> } = {}) {
  const snaps: SnapRow[] = [];
  const recipients: RecipientRow[] = [];
  const objects = new Map<string, Buffer>();
  const storage: SnapStorage = {
    put: vi.fn(async (path: string, bytes: Buffer) => void objects.set(path, bytes)),
    get: vi.fn(async (path: string) => objects.get(path) ?? null),
    remove: vi.fn(async (paths: string[]) => paths.forEach((p) => objects.delete(p))),
    copyToReports: vi.fn(async () => true),
    removeReports: vi.fn(async () => {}),
    listOlderThan: vi.fn(async () => []),
  };
  const repository = {
    insertSnap: vi.fn(
      async (
        sender: string,
        s: { id: string; mealId: string; objectPath: string; createdAt: string; expiresAt: string },
      ) => {
        if (snaps.some((x) => x.meal_id === s.mealId)) throw { code: '23505' };
        snaps.push({
          id: s.id,
          sender_id: sender,
          meal_id: s.mealId,
          object_path: s.objectPath,
          created_at: s.createdAt,
          expires_at: s.expiresAt,
          deleted_at: null,
        });
      },
    ),
    insertRecipients: vi.fn(async (snapId: string, ids: string[], expiresAt: string) => {
      recipients.push(
        ...ids.map((id) => ({
          snap_id: snapId,
          recipient_id: id,
          expires_at: expiresAt,
          opened_at: null,
        })),
      );
    }),
    snapForMeal: vi.fn(
      async (sender: string, mealId: string) =>
        snaps.find((s) => s.sender_id === sender && s.meal_id === mealId) ?? null,
    ),
    countSentBetween: vi.fn(
      async (sender: string, startIso: string, endIso: string) =>
        snaps.filter(
          (s) => s.sender_id === sender && s.created_at >= startIso && s.created_at < endIso,
        ).length,
    ),
    inboxFor: vi.fn(async (me2: string, nowIso: string) =>
      recipients
        .filter((r) => r.recipient_id === me2 && !r.opened_at && r.expires_at > nowIso)
        .flatMap((r) => {
          const s = snaps.find((x) => x.id === r.snap_id && !x.deleted_at);
          return s
            ? [
                {
                  snap_id: s.id,
                  sender_id: s.sender_id,
                  created_at: s.created_at,
                  expires_at: r.expires_at,
                },
              ]
            : [];
        }),
    ),
    ownSnap: vi.fn(
      async (sender: string, snapId: string) =>
        snaps.find((s) => s.id === snapId && s.sender_id === sender && !s.deleted_at) ?? null,
    ),
    markDeleted: vi.fn(async (snapId: string, nowIso: string) => {
      const s = snaps.find((x) => x.id === snapId && !x.deleted_at);
      if (s) s.deleted_at = nowIso;
    }),
    deleteRecipients: vi.fn(async (_sender: string, snapId: string) => {
      for (let i = recipients.length - 1; i >= 0; i--)
        if (recipients[i]?.snap_id === snapId) recipients.splice(i, 1);
    }),
  };
  const friendList = [...friends];
  const service = createSnapsService({
    repository,
    storage,
    friends: { friendIds: vi.fn(async () => friendList) } as never,
    meals: {
      getMeal: vi.fn(async (_u: string, id: string) => {
        if (!meals[id]) throw new NotFoundError('Meal not found');
        return { id, eatenAt: meals[id] };
      }),
    } as never,
    profiles: {
      getCards: vi.fn(async (ids: string[]) => people.filter((p) => ids.includes(p.userId))),
    } as never,
  });
  return { service, repository, storage, snaps, recipients, objects, friendList };
}

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
