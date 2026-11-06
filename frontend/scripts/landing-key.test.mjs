import { describe, expect, it } from 'vitest';
import { keyPix } from './landing-key.mjs';

describe('keyPix', () => {
  it('removes exterior and seeded enclosed background without tinting the painting edge', () => {
    const width = 64;
    const height = 64;
    const pixels = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const painted =
          x >= 20 && x < 44 && y >= 20 && y < 44 && !(x >= 28 && x < 34 && y >= 28 && y < 34);
        pixels.set(painted ? [225, 30, 25, 255] : [245, 215, 122, 255], i);
      }
    }

    const bounds = keyPix(pixels, width, height, {
      T0: 14,
      T1: 30,
      H0: 11,
      PK: 0,
      seeds: [[30 * 16, 30 * 16]],
    });
    const at = (x, y) => pixels.slice((y * width + x) * 4, (y * width + x) * 4 + 4);

    expect(at(0, 0)[3]).toBe(0);
    expect(at(31, 31)[3]).toBe(0);
    expect(at(32, 32)[3]).toBe(0);
    expect(at(20, 30)[3]).toBe(255);
    expect(at(20, 30)[0]).toBeGreaterThan(at(20, 30)[1] + 60);
    expect(bounds).toEqual({ x0: 20, y0: 20, x1: 43, y1: 43 });
  });
});
