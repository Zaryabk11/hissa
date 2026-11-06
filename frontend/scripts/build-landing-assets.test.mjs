import { expect, it } from 'vitest';
import { fittedImage } from './build-landing-assets.mjs';

it('clips a fitted painting that extends beyond the output canvas', async () => {
  const width = 64;
  const height = 64;
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < pixels.length; i += 4) pixels.set([220, 40, 30, 255], i);

  const { data, info } = await (
    await fittedImage(pixels, { x0: 4, y0: 20, x1: 59, y1: 44 }, width, height, 0.9)
  )
    .raw()
    .toBuffer({ resolveWithObject: true });

  expect(info.width).toBe(64);
  expect(info.height).toBe(64);
  expect(data[3]).toBe(0);
  expect(data[40 * width * 4 + 3]).toBe(255);
});
