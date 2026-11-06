import sharp from 'sharp';
import { vi } from 'vitest';
import { NotFoundError } from '../../../shared/errors';
import type { PersonCard } from '../../profiles';
import { createSnapsService } from '../snaps.service';
import type { SnapStorage } from '../snaps.types';

// Stateful fakes shared by the snaps service and race tests.
export const [me, bob, cat, dan] = ['u1', 'u2', 'u3', 'u4'];
export const NOW = new Date('2026-11-06T10:00:00Z'); // PKT 15:00 on 2026-11-06
export const HOUR = 3_600_000;
const people: PersonCard[] = [me, bob, cat, dan].map((id) => ({
  userId: id,
  username: `name_${id}`,
  displayName: `Name ${id}`,
}));

type SnapRow = {
  id: string;
  sender_id: string;
  meal_id: string | null;
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

export type ReportRow = {
  id: string;
  reporter_id: string;
  target_id: string;
  snap_id: string;
  reason: string;
  created_at: string;
  evidence_path: string | null;
  evidence_expires_at: string | null;
};

// Yields to the event loop so parallel callers interleave between awaits.
const tick = () => new Promise<void>((r) => setImmediate(r));

export const photo = (format: 'jpeg' | 'png' | 'webp' = 'jpeg') =>
  sharp({ create: { width: 64, height: 48, channels: 3, background: '#c33' } })
    [format]()
    .toBuffer()
    .then((b) => b.toString('base64'));

export function setup({
  friends = [bob, cat],
  meals = { m1: new Date(NOW.getTime() - 5 * 60_000).toISOString() } as Record<string, string>,
}: { friends?: string[]; meals?: Record<string, string> } = {}) {
  const snaps: SnapRow[] = [];
  const recipients: RecipientRow[] = [];
  const objects = new Map<string, Buffer>();
  const reportObjects = new Map<string, Buffer>();
  const reports: ReportRow[] = [];
  // Object creation times for the bucket listings. Tests send at NOW; set others directly.
  const objectAt = new Map<string, string>();
  const reportAt = new Map<string, string>();
  const older = (m: Map<string, Buffer>, at: Map<string, string>, cutoff: Date) =>
    [...m.keys()].filter((k) => new Date(at.get(k) ?? NOW.toISOString()) < cutoff);
  const storage: SnapStorage = {
    put: vi.fn(async (path: string, bytes: Buffer) => void objects.set(path, bytes)),
    get: vi.fn(async (path: string) => {
      await tick();
      return objects.get(path) ?? null;
    }),
    remove: vi.fn(async (paths: string[]) => paths.forEach((p) => objects.delete(p))),
    copyToReports: vi.fn(async (path: string, dest: string) => {
      const b = objects.get(path);
      if (b) reportObjects.set(dest, b);
      return !!b;
    }),
    removeReports: vi.fn(async (paths: string[]) => paths.forEach((p) => reportObjects.delete(p))),
    listOlderThan: vi.fn(async (cutoff: Date) => older(objects, objectAt, cutoff)),
    listReportsOlderThan: vi.fn(async (cutoff: Date) => older(reportObjects, reportAt, cutoff)),
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
    // Same filters as the real query: my unopened row of a snap that is not deleted.
    recipientFor: vi.fn(async (recipientId: string, snapId: string) => {
      await tick();
      const r = recipients.find(
        (x) => x.snap_id === snapId && x.recipient_id === recipientId && !x.opened_at,
      );
      const s = r && snaps.find((x) => x.id === snapId && !x.deleted_at);
      return r && s
        ? {
            snap_id: s.id,
            sender_id: s.sender_id,
            object_path: s.object_path,
            created_at: s.created_at,
            expires_at: r.expires_at,
          }
        : null;
    }),
    // Mirrors the single conditional UPDATE: the check and the set run with no await between
    // them, so exactly one of many interleaved callers wins.
    claimOpen: vi.fn(async (snapId: string, recipientId: string, nowIso: string) => {
      await tick();
      const r = recipients.find(
        (x) =>
          x.snap_id === snapId &&
          x.recipient_id === recipientId &&
          x.opened_at === null &&
          x.expires_at > nowIso,
      );
      if (!r) return false;
      r.opened_at = nowIso;
      return true;
    }),
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
    // Hard delete of the sender's own snap (recipients cascade).
    deleteSnap: vi.fn(async (sender: string, snapId: string) => {
      const i = snaps.findIndex((x) => x.id === snapId && x.sender_id === sender);
      if (i < 0) return;
      snaps.splice(i, 1);
      for (let j = recipients.length - 1; j >= 0; j--)
        if (recipients[j]?.snap_id === snapId) recipients.splice(j, 1);
    }),
    // Mirrors the real query: my opened row of any snap (deleted or not).
    recipientOpened: vi.fn(async (recipientId: string, snapId: string) => {
      const r = recipients.find(
        (x) => x.snap_id === snapId && x.recipient_id === recipientId && x.opened_at,
      );
      const s = r && snaps.find((x) => x.id === snapId);
      return s ? { sender_id: s.sender_id, object_path: s.object_path } : null;
    }),
    // Mirrors insert ... on conflict (reporter_id, snap_id) do nothing: false on a repeat.
    insertReport: vi.fn(async (row: ReportRow) => {
      if (reports.some((x) => x.reporter_id === row.reporter_id && x.snap_id === row.snap_id))
        return false;
      reports.push(row);
      return true;
    }),
    // Mirrors the real query: live snaps that are expired, or whose recipients all opened at or
    // before the grace cutoff.
    dueForRemoval: vi.fn(async (nowIso: string, graceIso: string) =>
      snaps
        .filter((s) => {
          if (s.deleted_at) return false;
          if (s.expires_at <= nowIso) return true;
          const rs = recipients.filter((r) => r.snap_id === s.id);
          return rs.length > 0 && rs.every((r) => r.opened_at && r.opened_at <= graceIso);
        })
        .map((s) => ({ id: s.id, object_path: s.object_path, expires_at: s.expires_at })),
    ),
    liveSnapIds: vi.fn(async (ids: string[]) =>
      snaps.filter((s) => ids.includes(s.id) && !s.deleted_at).map((s) => s.id),
    ),
    purgeBefore: vi.fn(async (iso: string) => {
      for (let i = snaps.length - 1; i >= 0; i--) {
        const s = snaps[i] as SnapRow;
        if (!s.deleted_at || s.expires_at >= iso) continue;
        snaps.splice(i, 1);
        for (let j = recipients.length - 1; j >= 0; j--)
          if (recipients[j]?.snap_id === s.id) recipients.splice(j, 1);
      }
    }),
    evidenceDue: vi.fn(async (nowIso: string) =>
      reports
        .filter((r) => r.evidence_path && r.evidence_expires_at && r.evidence_expires_at <= nowIso)
        .map((r) => ({ id: r.id, evidence_path: r.evidence_path as string })),
    ),
    clearEvidence: vi.fn(async (reportId: string) => {
      const r = reports.find((x) => x.id === reportId);
      if (r) r.evidence_path = null;
    }),
    referencedEvidence: vi.fn(async (paths: string[]) =>
      reports.flatMap((r) =>
        r.evidence_path && paths.includes(r.evidence_path) ? [r.evidence_path] : [],
      ),
    ),
  };
  // The fake friend list is the same for every sender; areFriends reads it live.
  const friendList = [...friends];
  const service = createSnapsService({
    repository,
    storage,
    friends: {
      friendIds: vi.fn(async () => friendList),
      areFriends: vi.fn(async (a: string, b: string) => {
        await tick();
        return a !== b && (friendList.includes(a) || friendList.includes(b));
      }),
    } as never,
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
  return {
    service,
    repository,
    storage,
    snaps,
    recipients,
    objects,
    reports,
    reportObjects,
    objectAt,
    reportAt,
    friendList,
  };
}
