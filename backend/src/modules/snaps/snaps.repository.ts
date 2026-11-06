import type { Db } from '../../shared/db';
import type {
  DueSnap,
  InboxRow,
  NewReport,
  NewSnap,
  OpenedRow,
  OpenRow,
  SnapRow,
} from './snaps.types';

const SNAP_COLUMNS = 'id, sender_id, meal_id, object_path, created_at, expires_at, deleted_at';
const INBOX_LIMIT = 50;
const SWEEP_LIMIT = 1000;

// Data access for snaps and their recipients. The service role bypasses RLS, so every query
// that starts from a caller is scoped to that caller.
export function createSnapsRepository(db: Db) {
  return {
    // Throws with code 23505 when the meal already has a snap.
    async insertSnap(senderId: string, s: NewSnap): Promise<void> {
      const { error } = await db.from('snaps').insert({
        id: s.id,
        sender_id: senderId,
        meal_id: s.mealId,
        object_path: s.objectPath,
        created_at: s.createdAt,
        expires_at: s.expiresAt,
      });
      if (error) throw error;
    },

    // One bulk insert for the whole frozen recipient list.
    async insertRecipients(
      snapId: string,
      recipientIds: string[],
      expiresAt: string,
    ): Promise<void> {
      const { error } = await db.from('snap_recipients').insert(
        recipientIds.map((id) => ({
          snap_id: snapId,
          recipient_id: id,
          audience: 'friend',
          expires_at: expiresAt,
        })),
      );
      if (error) throw error;
    },

    async snapForMeal(senderId: string, mealId: string): Promise<SnapRow | null> {
      const { data, error } = await db
        .from('snaps')
        .select(SNAP_COLUMNS)
        .eq('sender_id', senderId)
        .eq('meal_id', mealId)
        .maybeSingle();
      if (error) throw error;
      return data as SnapRow | null;
    },

    // Snaps the sender created in [startIso, endIso), including unsent ones.
    async countSentBetween(senderId: string, startIso: string, endIso: string): Promise<number> {
      const { count, error } = await db
        .from('snaps')
        .select('id', { count: 'exact', head: true })
        .eq('sender_id', senderId)
        .gte('created_at', startIso)
        .lt('created_at', endIso);
      if (error) throw error;
      return count ?? 0;
    },

    // Unopened, unexpired rows of a snap that still exists, newest first. The recipient expiry is
    // the snap expiry (a constant TTL after creation), so it orders the same as created_at.
    async inboxFor(recipientId: string, nowIso: string): Promise<InboxRow[]> {
      const { data, error } = await db
        .from('snap_recipients')
        .select('snap_id, expires_at, snaps!inner(sender_id, created_at, deleted_at)')
        .eq('recipient_id', recipientId)
        .is('opened_at', null)
        .gt('expires_at', nowIso)
        .is('snaps.deleted_at', null)
        .order('expires_at', { ascending: false })
        .limit(INBOX_LIMIT);
      if (error) throw error;
      return (data as unknown as RawInbox[]).map((r) => ({
        snap_id: r.snap_id,
        sender_id: r.snaps.sender_id,
        created_at: r.snaps.created_at,
        expires_at: r.expires_at,
      }));
    },

    // The caller's unopened row of a snap that is not deleted. Expiry is checked by the caller
    // (against its clock) and again by claimOpen.
    async recipientFor(recipientId: string, snapId: string): Promise<OpenRow | null> {
      const { data, error } = await db
        .from('snap_recipients')
        .select('snap_id, expires_at, snaps!inner(sender_id, object_path, created_at, deleted_at)')
        .eq('recipient_id', recipientId)
        .eq('snap_id', snapId)
        .is('opened_at', null)
        .is('snaps.deleted_at', null)
        .maybeSingle();
      if (error) throw error;
      const r = data as unknown as RawOpen | null;
      return r
        ? {
            snap_id: r.snap_id,
            sender_id: r.snaps.sender_id,
            object_path: r.snaps.object_path,
            created_at: r.snaps.created_at,
            expires_at: r.expires_at,
          }
        : null;
    },

    // The view-once guard: ONE conditional UPDATE. True only if this call changed the row, so of
    // any number of concurrent callers exactly one wins.
    async claimOpen(snapId: string, recipientId: string, nowIso: string): Promise<boolean> {
      const { data, error } = await db
        .from('snap_recipients')
        .update({ opened_at: nowIso })
        .eq('snap_id', snapId)
        .eq('recipient_id', recipientId)
        .is('opened_at', null)
        .gt('expires_at', nowIso)
        .select('snap_id');
      if (error) throw error;
      return data.length > 0;
    },

    // The caller's row of a snap they have opened, even if the snap was deleted since.
    async recipientOpened(recipientId: string, snapId: string): Promise<OpenedRow | null> {
      const { data, error } = await db
        .from('snap_recipients')
        .select('snaps!inner(sender_id, object_path)')
        .eq('recipient_id', recipientId)
        .eq('snap_id', snapId)
        .not('opened_at', 'is', null)
        .maybeSingle();
      if (error) throw error;
      const r = data as unknown as { snaps: OpenedRow } | null;
      return r ? { sender_id: r.snaps.sender_id, object_path: r.snaps.object_path } : null;
    },

    // False when the caller already reported this snap (the conflict is ignored).
    async insertReport(row: NewReport): Promise<boolean> {
      const { data, error } = await db
        .from('reports')
        .upsert(row, { onConflict: 'reporter_id,snap_id', ignoreDuplicates: true })
        .select('id');
      if (error) throw error;
      return data.length > 0;
    },

    // The caller's own snap that is not deleted yet.
    async ownSnap(senderId: string, snapId: string): Promise<SnapRow | null> {
      const { data, error } = await db
        .from('snaps')
        .select(SNAP_COLUMNS)
        .eq('id', snapId)
        .eq('sender_id', senderId)
        .is('deleted_at', null)
        .maybeSingle();
      if (error) throw error;
      return data as SnapRow | null;
    },

    // Conditional on not yet deleted. Callers have already authorised the snap.
    async markDeleted(snapId: string, nowIso: string): Promise<void> {
      const { error } = await db
        .from('snaps')
        .update({ deleted_at: nowIso })
        .eq('id', snapId)
        .is('deleted_at', null);
      if (error) throw error;
    },

    // Hard delete of the caller's own snap (recipients cascade). Used to undo a failed send.
    async deleteSnap(senderId: string, snapId: string): Promise<void> {
      const { error } = await db.from('snaps').delete().eq('id', snapId).eq('sender_id', senderId);
      if (error) throw error;
    },

    // Only for a snap the caller sent: the sender is checked in the same statement via the id list.
    async deleteRecipients(senderId: string, snapId: string): Promise<void> {
      const { data: own, error: ownError } = await db
        .from('snaps')
        .select('id')
        .eq('id', snapId)
        .eq('sender_id', senderId);
      if (ownError) throw ownError;
      if (!own.length) return;
      const { error } = await db.from('snap_recipients').delete().eq('snap_id', snapId);
      if (error) throw error;
    },

    // Sweeper queries below are system-wide (no caller), never reached from a request.

    // Live snaps that are expired, or whose recipients all opened at or before graceIso. Oldest
    // first, so expired snaps always fit the page; the rest wait for a later sweep.
    // ponytail: scans all live snaps (about a day's worth) in JS; use an anti-join or RPC if that
    // passes SWEEP_LIMIT.
    async dueForRemoval(nowIso: string, graceIso: string): Promise<DueSnap[]> {
      const { data, error } = await db
        .from('snaps')
        .select('id, object_path, expires_at, snap_recipients(opened_at)')
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(SWEEP_LIMIT);
      if (error) throw error;
      const now = Date.parse(nowIso);
      const grace = Date.parse(graceIso);
      return (data as unknown as RawDue[])
        .filter(
          (s) =>
            Date.parse(s.expires_at) <= now ||
            (s.snap_recipients.length > 0 &&
              s.snap_recipients.every((r) => r.opened_at && Date.parse(r.opened_at) <= grace)),
        )
        .map((s) => ({ id: s.id, object_path: s.object_path, expires_at: s.expires_at }));
    },

    // The ids among `ids` that still have a snap row not marked deleted.
    async liveSnapIds(ids: string[]): Promise<string[]> {
      if (!ids.length) return [];
      const { data, error } = await db
        .from('snaps')
        .select('id')
        .in('id', ids)
        .is('deleted_at', null);
      if (error) throw error;
      return data.map((r) => r.id as string);
    },

    // Hard-deletes deleted snaps that expired before iso (recipients cascade).
    async purgeBefore(iso: string): Promise<void> {
      const { error } = await db
        .from('snaps')
        .delete()
        .not('deleted_at', 'is', null)
        .lt('expires_at', iso);
      if (error) throw error;
    },

    async evidenceDue(nowIso: string): Promise<{ id: string; evidence_path: string }[]> {
      const { data, error } = await db
        .from('reports')
        .select('id, evidence_path')
        .not('evidence_path', 'is', null)
        .lte('evidence_expires_at', nowIso)
        .order('evidence_expires_at', { ascending: true })
        .limit(SWEEP_LIMIT);
      if (error) throw error;
      return data as { id: string; evidence_path: string }[];
    },

    async clearEvidence(reportId: string): Promise<void> {
      const { error } = await db.from('reports').update({ evidence_path: null }).eq('id', reportId);
      if (error) throw error;
    },

    // The paths among `paths` that some report still points at.
    async referencedEvidence(paths: string[]): Promise<string[]> {
      if (!paths.length) return [];
      const { data, error } = await db
        .from('reports')
        .select('evidence_path')
        .in('evidence_path', paths);
      if (error) throw error;
      return data.map((r) => r.evidence_path as string);
    },
  };
}
export type SnapsRepository = ReturnType<typeof createSnapsRepository>;

type RawOpen = {
  snap_id: string;
  expires_at: string;
  snaps: { sender_id: string; object_path: string; created_at: string };
};

type RawInbox = {
  snap_id: string;
  expires_at: string;
  snaps: { sender_id: string; created_at: string };
};

type RawDue = {
  id: string;
  object_path: string;
  expires_at: string;
  snap_recipients: { opened_at: string | null }[];
};
