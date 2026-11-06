import { ApiError, apiAuthed } from '../../shared/api/client';
import { snapsEnabled } from '../../shared/flags';
import { getScan } from './store';

// The web camera returns a data: URI (often PNG); the API wants raw base64 and the real mime type, as for a scan.
export function snapBody(mealId: string, image: string, mimeType: string) {
  const m = /^data:([^;,]+)[^,]*,/.exec(image);
  return { mealId, image: m ? image.slice(m[0].length) : image, mimeType: m?.[1] ?? mimeType };
}

/** Send the scan photo of a just-saved meal to friends. Best effort: never throws, so callers do not await it. */
export async function sendSnap(mealId: string): Promise<void> {
  try {
    const { image, mimeType } = getScan();
    if (!snapsEnabled || !image) return;
    const init = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(snapBody(mealId, image, mimeType)) };
    // One retry for a network error or a 5xx; a 409 (already sent) or any other 4xx is final.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await apiAuthed('/api/snaps', init);
        return;
      } catch (e) {
        if (e instanceof ApiError && e.status < 500) return;
      }
    }
  } catch {
    // A snap must never break the meal save.
  }
}

/** The step after a meal is saved: starts the send and returns at once, so the save and navigation never wait on it. */
export function afterSave(mealId: string): void {
  void sendSnap(mealId);
}
