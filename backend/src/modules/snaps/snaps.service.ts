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
import type { InboxItem, OpenResult, SendResult, SnapStorage } from './snaps.types';

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

// Business rules for snaps. Photo bytes are never logged and never returned by the inbox.
export function createSnapsService({ repository, storage, friends, meals, profiles }: SnapsDeps) {
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
        // Do not leave an orphan object (or a recipient-less snap) behind.
        await storage.remove([objectPath]).catch(() => {});
        if (snapInserted) await repository.markDeleted(id, now.toISOString()).catch(() => {});
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

    // Remove the object first: if that fails the rows stay and the sender can retry.
    async unsend(userId: string, snapId: string, now = new Date()): Promise<void> {
      const snap = await repository.ownSnap(userId, snapId);
      if (!snap) throw new NotFoundError('Snap not found');
      await storage.remove([snap.object_path]);
      await repository.markDeleted(snap.id, now.toISOString());
      await repository.deleteRecipients(userId, snap.id);
    },
  };
}
export type SnapsService = ReturnType<typeof createSnapsService>;
