import { randomUUID } from 'node:crypto';
import {
  ConflictError,
  NotFoundError,
  TooManyRequestsError,
  ValidationError,
} from '../../shared/errors';
import { resizePhoto } from '../../shared/image';
import { logger } from '../../shared/logger';
import { pktDay, pktDayBounds } from '../../shared/time/pkt';
import type { FriendsService } from '../friends';
import type { MealsService } from '../meals';
import type { ProfilesService } from '../profiles';
import type { SnapsRepository } from './snaps.repository';
import type { InboxItem, OpenResult, ReportReason, SendResult, SnapStorage } from './snaps.types';

interface SnapsDeps {
  repository: SnapsRepository;
  storage: SnapStorage;
  friends: FriendsService;
  meals: MealsService;
  profiles: ProfilesService;
}

const FRESH_MEAL_MS = 30 * 60_000;
const DAILY_CAP = 12;
const TTL_MS = 24 * 3_600_000;
const EVIDENCE_MS = 30 * 24 * 3_600_000;
const GRACE_MS = 10 * 60_000; // the report window after the last open
const ORPHAN_MS = 25 * 3_600_000;
const ORPHAN_EVIDENCE_MS = 31 * 24 * 3_600_000;
const PURGE_MS = 7 * 24 * 3_600_000;
const CHUNK = 100; // ids per `in (...)` query
const UUID_JPG = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jpg$/;

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

// The subset of `items` that `pick` returns, asked in chunks so the query string stays short.
async function inChunks(items: string[], pick: (chunk: string[]) => Promise<string[]>) {
  const out = new Set<string>();
  for (let i = 0; i < items.length; i += CHUNK)
    for (const x of await pick(items.slice(i, i + CHUNK))) out.add(x);
  return out;
}

// Business rules for snaps. Photo bytes are never logged and never returned by the inbox.
export function createSnapsService({ repository, storage, friends, meals, profiles }: SnapsDeps) {
  const lastStageError = new Map<string, string>(); // per process: see sweep's `stage`
  return {
    async send(
      userId: string,
      input: { mealId: string; image: string },
      now = new Date(),
    ): Promise<SendResult> {
      const meal = await meals.getMeal(userId, input.mealId); // 404 when not the caller's
      if (now.getTime() - new Date(meal.eatenAt).getTime() > FRESH_MEAL_MS)
        throw new ValidationError('Snaps can only be sent right after logging a meal');
      if (await repository.snapForMeal(userId, input.mealId))
        throw new ConflictError('A snap was already sent for this meal');
      const { startIso, endIso } = pktDayBounds(pktDay(now));
      if ((await repository.countSentBetween(userId, startIso, endIso)) >= DAILY_CAP)
        throw new TooManyRequestsError('Daily snap limit reached');

      const recipientIds = await friends.friendIds(userId);
      if (!recipientIds.length) return { id: null, expiresAt: null, recipients: { friends: 0 } };

      const jpeg = await resizePhoto(Buffer.from(input.image, 'base64'));
      const id = randomUUID();
      const objectPath = `${id}.jpg`;
      const expiresAt = new Date(now.getTime() + TTL_MS).toISOString();
      await storage.put(objectPath, jpeg);
      let snapInserted = false;
      try {
        await repository.insertSnap(userId, {
          id,
          mealId: input.mealId,
          objectPath,
          createdAt: now.toISOString(),
          expiresAt,
        });
        snapInserted = true;
        await repository.insertRecipients(id, recipientIds, expiresAt);
      } catch (e) {
        // Do not leave an orphan object or a recipient-less snap behind. The row is deleted, not
        // soft-deleted, so it stops holding the meal's unique slot and the app's retry can succeed.
        // A failed cleanup is left to the sweeper (orphan object; the row expires and is purged).
        const failed = (e2: unknown) =>
          logger.warn('snap.delete_failed', { snapId: id, message: message(e2) });
        await storage.remove([objectPath]).catch(failed);
        if (snapInserted) await repository.deleteSnap(userId, id).catch(failed);
        if ((e as { code?: string }).code === '23505')
          throw new ConflictError('A snap was already sent for this meal');
        throw e;
      }
      logger.info('snap.created', { snapId: id, senderId: userId, friends: recipientIds.length });
      return { id, expiresAt, recipients: { friends: recipientIds.length } };
    },

    async inbox(userId: string, now = new Date()): Promise<{ items: InboxItem[] }> {
      const rows = await repository.inboxFor(userId, now.toISOString());
      const cards = await profiles.getCards([...new Set(rows.map((r) => r.sender_id))]);
      const items = rows.flatMap((r): InboxItem[] => {
        const sender = cards.find((c) => c.userId === r.sender_id);
        return sender
          ? [{ id: r.snap_id, sender, sentAt: r.created_at, expiresAt: r.expires_at }]
          : [];
      });
      return { items };
    },

    // View once. Every failure is the same 404 so nothing leaks (not a recipient, opened, expired,
    // deleted, unfriended). Bytes are read before the claim so a storage error does not burn the
    // snap. The object stays: the sweeper removes it after the grace period.
    async open(userId: string, snapId: string, now = new Date()): Promise<OpenResult> {
      const gone = () => new NotFoundError('Snap not found');
      const nowIso = now.toISOString();
      const row = await repository.recipientFor(userId, snapId);
      if (!row || row.expires_at <= nowIso) throw gone();
      if (!(await friends.areFriends(row.sender_id, userId))) throw gone();
      const [sender] = await profiles.getCards([row.sender_id]);
      if (!sender) throw gone();
      const bytes = await storage.get(row.object_path);
      if (!bytes) throw gone();
      if (!(await repository.claimOpen(row.snap_id, userId, nowIso))) throw gone();
      logger.info('snap.opened', { snapId: row.snap_id, viewerId: userId });
      return {
        image: bytes.toString('base64'),
        mimeType: 'image/jpeg',
        sender,
        sentAt: row.created_at,
        expiresAt: row.expires_at,
      };
    },

    // Only a recipient who opened the snap can report it; every other case is the same 404. The
    // photo is copied first so a failed copy leaves no row; a repeat report (or a failed insert)
    // removes its own copy again. The original object is never touched.
    async report(
      userId: string,
      snapId: string,
      reason: ReportReason,
      now = new Date(),
    ): Promise<void> {
      const row = await repository.recipientOpened(userId, snapId);
      if (!row) throw new NotFoundError('Snap not found');
      const id = randomUUID();
      const dest = `${id}.jpg`;
      const kept = await storage.copyToReports(row.object_path, dest);
      let inserted = false;
      try {
        inserted = await repository.insertReport({
          id,
          reporter_id: userId,
          target_id: row.sender_id,
          snap_id: snapId,
          reason,
          created_at: now.toISOString(),
          evidence_path: kept ? dest : null,
          evidence_expires_at: kept ? new Date(now.getTime() + EVIDENCE_MS).toISOString() : null,
        });
      } finally {
        if (kept && !inserted)
          await storage.removeReports([dest]).catch((e: unknown) => {
            // the sweeper removes unreferenced copies after 31 days
            logger.warn('snap.delete_failed', { path: dest, message: message(e) });
          });
      }
      if (inserted)
        logger.info('snap.reported', { snapId, reporterId: userId, evidenceKept: kept });
    },

    // Remove the object first: if that fails the rows stay and the sender can retry.
    async unsend(userId: string, snapId: string, now = new Date()): Promise<void> {
      const snap = await repository.ownSnap(userId, snapId);
      if (!snap) throw new NotFoundError('Snap not found');
      await storage.remove([snap.object_path]);
      await repository.markDeleted(snap.id, now.toISOString());
      await repository.deleteRecipients(userId, snap.id);
    },

    // Deletes by state, not schedule, so a restart catches up. Every removal deletes the object
    // first and records it second: a failure leaves the row as it was and the next sweep retries.
    // Each stage runs even if an earlier one failed. Logs ids only, never who opened a snap.
    async sweep(now = new Date()): Promise<{ deleted: number; failed: number }> {
      let deleted = 0;
      let failed = 0;
      const nowIso = now.toISOString();
      const ago = (ms: number) => new Date(now.getTime() - ms);
      const attempt = async (meta: Record<string, string>, work: () => Promise<void>) => {
        try {
          await work();
          deleted++;
          logger.info('snap.object_deleted', meta);
        } catch (e) {
          failed++;
          logger.warn('snap.delete_failed', { ...meta, message: message(e) });
        }
      };
      // A stage that keeps failing the same way (buckets missing, migration not applied) warns
      // once, then logs at debug; a new message, or a good run in between, warns again.
      const stage = async (name: string, work: () => Promise<void>) => {
        try {
          await work();
          lastStageError.delete(name);
        } catch (e) {
          failed++;
          const meta = { stage: name, message: message(e) };
          const repeat = lastStageError.get(name) === meta.message;
          lastStageError.set(name, meta.message);
          if (repeat) logger.debug('snap.delete_failed', meta);
          else logger.warn('snap.delete_failed', meta);
        }
      };

      await stage('due', async () => {
        for (const s of await repository.dueForRemoval(nowIso, ago(GRACE_MS).toISOString())) {
          const reason = Date.parse(s.expires_at) <= now.getTime() ? 'expired' : 'opened';
          await attempt({ snapId: s.id, reason }, async () => {
            await storage.remove([s.object_path]);
            await repository.markDeleted(s.id, nowIso);
          });
        }
      });

      // Objects no live row accounts for (a crash mid-send, a lost markDeleted).
      await stage('orphans', async () => {
        const names = await storage.listOlderThan(ago(ORPHAN_MS));
        const idOf = (n: string) => UUID_JPG.exec(n)?.[1];
        const ids = names.flatMap((n) => idOf(n) ?? []);
        const live = await inChunks(ids, repository.liveSnapIds);
        for (const name of names) {
          const id = idOf(name);
          if (id && live.has(id)) continue;
          await attempt({ path: name, reason: 'orphan' }, () => storage.remove([name]));
        }
      });

      await stage('evidence', async () => {
        for (const r of await repository.evidenceDue(nowIso))
          await attempt({ reportId: r.id, reason: 'evidence_expired' }, async () => {
            await storage.removeReports([r.evidence_path]);
            await repository.clearEvidence(r.id);
          });
      });

      // Report copies no row points at (a crash between copy and insert, a failed cleanup).
      await stage('evidence_orphans', async () => {
        const names = await storage.listReportsOlderThan(ago(ORPHAN_EVIDENCE_MS));
        const kept = await inChunks(names, repository.referencedEvidence);
        for (const name of names)
          if (!kept.has(name))
            await attempt({ path: name, reason: 'evidence_orphan' }, () =>
              storage.removeReports([name]),
            );
      });

      await stage('purge', () => repository.purgeBefore(ago(PURGE_MS).toISOString()));

      logger.info('snap.sweep', { deleted, failed });
      return { deleted, failed };
    },
  };
}
export type SnapsService = ReturnType<typeof createSnapsService>;
