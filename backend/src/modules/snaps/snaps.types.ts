import type { PersonCard } from '../profiles';

// The only way code reaches the snap buckets. Paths are `<snapId>.jpg`.
export interface SnapStorage {
  put(path: string, bytes: Buffer): Promise<void>;
  // null when the object is missing
  get(path: string): Promise<Buffer | null>;
  // idempotent: a missing object is not an error
  remove(paths: string[]): Promise<void>;
  // false when the source object is gone
  copyToReports(path: string, dest: string): Promise<boolean>;
  removeReports(paths: string[]): Promise<void>;
  listOlderThan(cutoff: Date): Promise<string[]>;
}

// A row of public.snaps as the repository reads it.
export type SnapRow = {
  id: string;
  sender_id: string;
  meal_id: string | null;
  object_path: string;
  created_at: string;
  expires_at: string;
  deleted_at: string | null;
};

// An unopened, live recipient row joined with its snap.
export type InboxRow = {
  snap_id: string;
  sender_id: string;
  created_at: string;
  expires_at: string;
};

export type NewSnap = {
  id: string;
  mealId: string;
  objectPath: string;
  createdAt: string;
  expiresAt: string;
};

export type SendResult = {
  id: string | null;
  expiresAt: string | null;
  recipients: { friends: number };
};

export type InboxItem = { id: string; sender: PersonCard; sentAt: string; expiresAt: string };
