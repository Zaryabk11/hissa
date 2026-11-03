import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const apiAuthed = vi.fn();
vi.mock('../../shared/api/client', () => ({ apiAuthed: (...a: unknown[]) => apiAuthed(...a) }));

const dishes = { dishes: [] };

describe('getCatalog cache', () => {
  beforeEach(() => {
    vi.resetModules();
    apiAuthed.mockReset();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('fetches once for repeated and concurrent calls', async () => {
    apiAuthed.mockResolvedValue(dishes);
    const { getCatalog } = await import('./api');
    await Promise.all([getCatalog(), getCatalog()]);
    await getCatalog();
    expect(apiAuthed).toHaveBeenCalledTimes(1);
  });

  it('does not cache a failure', async () => {
    apiAuthed.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(dishes);
    const { getCatalog } = await import('./api');
    await expect(getCatalog()).rejects.toThrow('offline');
    await expect(getCatalog()).resolves.toBe(dishes);
    expect(apiAuthed).toHaveBeenCalledTimes(2);
  });

  it('refetches after the cache expires', async () => {
    apiAuthed.mockResolvedValue(dishes);
    const { getCatalog } = await import('./api');
    await getCatalog();
    vi.advanceTimersByTime(5 * 60_000 + 1);
    await getCatalog();
    expect(apiAuthed).toHaveBeenCalledTimes(2);
  });
});
