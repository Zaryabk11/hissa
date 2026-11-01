import sharp from 'sharp';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { ValidationError } from '../../../shared/errors';
import type { Dish } from '../../nutrition';
import { GeminiUnavailableError, type DetectedDish } from '../gemini.client';
import { createScanService } from '../scan.service';

const NOW = new Date('2026-11-01T19:30:00Z'); // already 2026-11-02 in PKT
const DISHES = [
  { slug: 'roti', name: 'Roti', unit: 'roti' },
  { slug: 'daal', name: 'Daal', unit: 'katori' },
] as Dish[];

let image: string;
beforeAll(async () => {
  const png = await sharp({ create: { width: 2000, height: 1000, channels: 3, background: '#fff' } })
    .png()
    .toBuffer();
  image = png.toString('base64');
});

function setup(
  detected: DetectedDish[] | Error = [],
  count: (day: string, call: number) => number = () => 0,
) {
  let calls = 0;
  const repository = {
    countScansForDay: vi.fn(async (_userId: string, day: string) => count(day, calls++)),
    recordScan: vi.fn(async () => {}),
  };
  const gemini = {
    detectDishes: vi.fn(async () => {
      if (detected instanceof Error) throw detected;
      return detected;
    }),
  };
  const nutrition = { listCatalog: vi.fn(async () => DISHES) };
  const service = createScanService({
    repository,
    gemini,
    nutrition,
    dailyCap: 10,
    now: () => NOW,
  });
  const scan = () => service.scanPhoto('u1', { image, mimeType: 'image/png' });
  return { repository, gemini, nutrition, service, scan };
}

describe('scan service', () => {
  it('records the scan for the PKT day and sends the catalog to Gemini', async () => {
    const { repository, gemini, scan } = setup([{ dish: 'roti', portion: 2, confidence: 0.9 }]);
    await scan();
    expect(repository.recordScan).toHaveBeenCalledExactlyOnceWith('u1', '2026-11-02');
    expect(gemini.detectDishes).toHaveBeenCalledWith(expect.anything(), [
      { slug: 'roti', unit: 'roti' },
      { slug: 'daal', unit: 'katori' },
    ]);
  });

  it('gives Gemini the resized JPEG, not the original upload', async () => {
    const { gemini, scan } = setup();
    await scan();
    const [sent] = gemini.detectDishes.mock.calls[0] as unknown as [Buffer];
    expect(await sharp(sent).metadata()).toMatchObject({ format: 'jpeg', width: 1024 });
  });

  it('does not use up a scan slot when the catalog read fails', async () => {
    const { repository, gemini, nutrition, scan } = setup();
    nutrition.listCatalog.mockRejectedValueOnce(new Error('db down'));
    await expect(scan()).rejects.toThrow('db down');
    expect(repository.recordScan).not.toHaveBeenCalled();
    expect(gemini.detectDishes).not.toHaveBeenCalled();
  });

  it('counts a new PKT day from zero even if the UTC day was at the cap', async () => {
    const { gemini, scan } = setup([], (day) => (day === '2026-11-01' ? 10 : 0));
    const result = await scan();
    expect(result.mode).toBe('detected');
    expect(gemini.detectDishes).toHaveBeenCalled();
  });

  it('returns manual mode at the cap without calling Gemini or recording', async () => {
    const { repository, gemini, scan } = setup([], () => 10);
    expect(await scan()).toEqual({ mode: 'manual', reason: 'daily_cap' });
    expect(gemini.detectDishes).not.toHaveBeenCalled();
    expect(repository.recordScan).not.toHaveBeenCalled();
  });

  it('loses a race for the last slot: over the cap after recording means manual, no Gemini', async () => {
    const { repository, gemini, scan } = setup([], (_day, call) => (call === 0 ? 9 : 11));
    expect(await scan()).toEqual({ mode: 'manual', reason: 'daily_cap' });
    expect(repository.recordScan).toHaveBeenCalledOnce();
    expect(gemini.detectDishes).not.toHaveBeenCalled();
  });

  it('takes the last slot when the count after recording equals the cap', async () => {
    const { repository, gemini, scan } = setup([], (_day, call) => (call === 0 ? 9 : 10));
    expect((await scan()).mode).toBe('detected');
    expect(repository.countScansForDay).toHaveBeenCalledTimes(2);
    expect(gemini.detectDishes).toHaveBeenCalledOnce();
  });

  it('falls back to manual mode when Gemini is unavailable, but the scan is still recorded', async () => {
    const { repository, scan } = setup(new GeminiUnavailableError());
    expect(await scan()).toEqual({ mode: 'manual', reason: 'gemini_unavailable' });
    expect(repository.recordScan).toHaveBeenCalledOnce();
  });

  it('lets other Gemini errors propagate', async () => {
    const { scan } = setup(new Error('boom'));
    await expect(scan()).rejects.toThrow('boom');
  });

  it('asks for confirmation below the 0.6 confidence floor and for unknown dishes', async () => {
    const { scan } = setup([
      { dish: 'roti', portion: 1, confidence: 0.59 },
      { dish: 'roti', portion: 1, confidence: 0.6 },
    ]);
    const result = await scan();
    expect(result.mode === 'detected' && result.items.map((i) => i.needsConfirmation)).toEqual([
      true,
      false,
    ]);
  });

  it('drops unknown items when at least one catalog dish was found', async () => {
    const { scan } = setup([
      { dish: 'unknown', portion: 1, confidence: 0.99 },
      { dish: 'mystery', portion: 1, confidence: 0.9 },
      { dish: 'roti', portion: 2, confidence: 0.9 },
    ]);
    const result = await scan();
    expect(result.mode === 'detected' && result.items.map((i) => i.dish)).toEqual(['roti']);
  });

  it.each([
    ['only unknown items', [{ dish: 'unknown', portion: 1, confidence: 0.9 }, { dish: 'mystery', portion: 1, confidence: 0.9 }]],
    ['nothing', []],
  ])('returns exactly one unknown item for %s', async (_name, detected) => {
    const { scan } = setup(detected);
    expect(await scan()).toEqual({
      mode: 'detected',
      items: [
        { dish: 'unknown', name: null, unit: null, portion: 0, confidence: 0, needsConfirmation: true },
      ],
    });
  });

  it('fills name and unit from the catalog', async () => {
    const { scan } = setup([{ dish: 'daal', portion: 1.5, confidence: 0.8 }]);
    expect(await scan()).toEqual({
      mode: 'detected',
      items: [
        {
          dish: 'daal',
          name: 'Daal',
          unit: 'katori',
          portion: 1.5,
          confidence: 0.8,
          needsConfirmation: false,
        },
      ],
    });
  });

  it.each([0, -1, 21, Number.NaN, Number.POSITIVE_INFINITY])(
    'replaces out-of-range portion %s with 1 and asks for confirmation',
    async (portion) => {
      const { scan } = setup([{ dish: 'roti', portion, confidence: 0.95 }]);
      const result = await scan();
      expect(result.mode === 'detected' && result.items[0]).toMatchObject({
        portion: 1,
        needsConfirmation: true,
      });
    },
  );

  it('keeps a portion of exactly 20', async () => {
    const { scan } = setup([{ dish: 'roti', portion: 20, confidence: 0.95 }]);
    const result = await scan();
    expect(result.mode === 'detected' && result.items[0]).toMatchObject({
      portion: 20,
      needsConfirmation: false,
    });
  });

  it('rejects an unreadable image without recording a scan', async () => {
    const { repository, gemini, service } = setup();
    await expect(
      service.scanPhoto('u1', { image: '!!!not-an-image!!!', mimeType: 'image/png' }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repository.recordScan).not.toHaveBeenCalled();
    expect(gemini.detectDishes).not.toHaveBeenCalled();
  });
});
