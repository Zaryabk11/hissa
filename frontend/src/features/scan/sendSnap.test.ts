import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../shared/api/client';
import { afterSave, sendSnap, snapBody } from './sendSnap';

const mocks = vi.hoisted(() => ({ apiAuthed: vi.fn(), flags: { snapsEnabled: true, scanThrows: false }, scan: { image: 'AAAA' as string | null, mimeType: 'image/jpeg' } }));
vi.mock('../../shared/api/client', async (orig) => ({ ...(await orig<typeof import('../../shared/api/client')>()), apiAuthed: mocks.apiAuthed }));
vi.mock('../../shared/flags', () => ({ get snapsEnabled() { return mocks.flags.snapsEnabled; } }));
vi.mock('./store', () => ({ getScan: () => { if (mocks.flags.scanThrows) throw new Error('boom'); return mocks.scan; } }));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.flags.snapsEnabled = true;
  mocks.flags.scanThrows = false;
  mocks.scan.image = 'AAAA';
  mocks.scan.mimeType = 'image/jpeg';
});

describe('snapBody', () => {
  it('strips a PNG data URI and takes its mime type', () => {
    expect(snapBody('m1', 'data:image/png;base64,QUJD', 'image/jpeg')).toEqual({ mealId: 'm1', image: 'QUJD', mimeType: 'image/png' });
  });
  it('passes plain base64 through', () => {
    expect(snapBody('m1', 'QUJD', 'image/webp')).toEqual({ mealId: 'm1', image: 'QUJD', mimeType: 'image/webp' });
  });
});

describe('sendSnap', () => {
  it('does nothing when the flag is off', async () => {
    mocks.flags.snapsEnabled = false;
    await sendSnap('m1');
    expect(mocks.apiAuthed).not.toHaveBeenCalled();
  });
  it('does nothing for a manual meal without a photo', async () => {
    mocks.scan.image = null;
    await sendSnap('m1');
    expect(mocks.apiAuthed).not.toHaveBeenCalled();
  });
  it('posts the snap once on success, built by snapBody', async () => {
    mocks.scan.image = 'data:image/png;base64,QUJD';
    mocks.apiAuthed.mockResolvedValue({ id: 's1' });
    await sendSnap('m1');
    expect(mocks.apiAuthed).toHaveBeenCalledTimes(1);
    const [path, init] = mocks.apiAuthed.mock.calls[0]!;
    expect(path).toBe('/api/snaps');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ mealId: 'm1', image: 'QUJD', mimeType: 'image/png' });
  });
  it('gives up after a 5xx twice', async () => {
    mocks.apiAuthed.mockRejectedValue(new ApiError(503, 'POST', '/api/snaps'));
    await expect(sendSnap('m1')).resolves.toBeUndefined();
    expect(mocks.apiAuthed).toHaveBeenCalledTimes(2);
  });
  it('treats a 413 as final and does not throw', async () => {
    mocks.apiAuthed.mockRejectedValue(new ApiError(413, 'POST', '/api/snaps'));
    await expect(sendSnap('m1')).resolves.toBeUndefined();
    expect(mocks.apiAuthed).toHaveBeenCalledTimes(1);
  });
  it('resolves even when reading the scan throws', async () => {
    mocks.flags.scanThrows = true;
    await expect(sendSnap('m1')).resolves.toBeUndefined();
    expect(mocks.apiAuthed).not.toHaveBeenCalled();
  });
  it('retries once after a 5xx', async () => {
    mocks.apiAuthed.mockRejectedValueOnce(new ApiError(503, 'POST', '/api/snaps')).mockResolvedValueOnce({ id: 's1' });
    await sendSnap('m1');
    expect(mocks.apiAuthed).toHaveBeenCalledTimes(2);
  });
  it('treats a 409 as final and does not throw', async () => {
    mocks.apiAuthed.mockRejectedValue(new ApiError(409, 'POST', '/api/snaps'));
    await expect(sendSnap('m1')).resolves.toBeUndefined();
    expect(mocks.apiAuthed).toHaveBeenCalledTimes(1);
  });
  it('resolves when offline twice', async () => {
    mocks.apiAuthed.mockRejectedValue(new TypeError('Network request failed'));
    await expect(sendSnap('m1')).resolves.toBeUndefined();
    expect(mocks.apiAuthed).toHaveBeenCalledTimes(2);
  });
});

describe('afterSave', () => {
  it('returns at once while the snap request is still pending', () => {
    mocks.apiAuthed.mockReturnValue(new Promise(() => {}));
    expect(afterSave('m1')).toBeUndefined();
    expect(mocks.apiAuthed).toHaveBeenCalledTimes(1);
  });
});
