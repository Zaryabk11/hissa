import type { Db } from '../../shared/db';
import type { SnapStorage } from './snaps.types';

const PAGE = 1000;

// The only code that touches the snap buckets (private; bytes leave only through the API).
export function createSnapStorageClient(db: Db): SnapStorage {
  const snaps = () => db.storage.from('snaps');
  const reports = () => db.storage.from('snap-reports');

  return {
    async put(path, bytes) {
      const { error } = await snaps().upload(path, bytes, { contentType: 'image/jpeg' });
      if (error) throw error;
    },

    async get(path) {
      const { data, error } = await snaps().download(path);
      if (error || !data) return null;
      return Buffer.from(await data.arrayBuffer());
    },

    async remove(paths) {
      if (!paths.length) return;
      // Removing a missing object is not an error in Supabase Storage.
      const { error } = await snaps().remove(paths);
      if (error) throw error;
    },

    async copyToReports(path, dest) {
      const { data, error } = await snaps().download(path);
      if (error || !data) return false;
      const { error: putError } = await reports().upload(
        dest,
        Buffer.from(await data.arrayBuffer()),
        {
          contentType: 'image/jpeg',
          upsert: true,
        },
      );
      if (putError) throw putError;
      return true;
    },

    async removeReports(paths) {
      if (!paths.length) return;
      const { error } = await reports().remove(paths);
      if (error) throw error;
    },

    listOlderThan: (cutoff) => listOlderThan(snaps(), cutoff),
    listReportsOlderThan: (cutoff) => listOlderThan(reports(), cutoff),
  };
}

type Bucket = ReturnType<Db['storage']['from']>;

// Objects live flat at the bucket root as `<id>.jpg`. Pages in a stable name order so offset
// paging cannot skip entries.
async function listOlderThan(bucket: Bucket, cutoff: Date): Promise<string[]> {
  const old: string[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await bucket.list('', {
      limit: PAGE,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw error;
    for (const f of data) if (f.created_at && new Date(f.created_at) < cutoff) old.push(f.name);
    if (data.length < PAGE) return old;
  }
}
