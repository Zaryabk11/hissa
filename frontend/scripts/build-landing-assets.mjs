import { Buffer } from 'node:buffer';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { keyPix } from './landing-key.mjs';

const outputDir = fileURLToPath(new URL('../public/landing-site/assets/dishes/', import.meta.url));
const size = 1024;
const dishes = {
  karahi: {
    T0: 26,
    T1: 62,
    H0: 22,
    PK: 6000,
    seeds: [
      [880, 486],
      [62, 600],
    ],
  },
  biryani: { T0: 14, T1: 30, H0: 11, PK: 20000, TW: 0.9 },
  daal: { T0: 14, T1: 28, H0: 10, PK: 0, TW: 0.86 },
  nihari: { T0: 18, T1: 36, H0: 12, PK: 0, TW: 0.9, cut: [405, 532, 280, 136] },
  aloogosht: {
    T0: 14,
    T1: 30,
    H0: 55,
    PK: 30000,
    TW: 0.9,
    sh: 60,
    pr: [
      [100, 330, 230, 570],
      [730, 290, 890, 480],
    ],
  },
  haleem: { T0: 14, T1: 26, H0: 10, PK: 0, TW: 0.74 },
  palak: {
    T0: 16,
    T1: 30,
    H0: 11,
    PK: 0,
    TW: 0.9,
    sh: 60,
    clean: { r: 2, fill: [[890, 565, 945, 695, 10]] },
  },
};

export async function fittedImage(pixels, bounds, width, height, fitWidth) {
  const { x0, y0, x1, y1 } = bounds;
  const paintedWidth = x1 - x0 + 1;
  const paintedHeight = y1 - y0 + 1;
  const scale = Math.min((fitWidth * width) / paintedWidth, (0.72 * height) / paintedHeight);
  const margin = 70;
  const sx = Math.max(0, x0 - margin);
  const sy = Math.max(0, y0 - margin);
  const sw = Math.min(width, x1 + margin) - sx;
  const sh = Math.min(height, y1 + margin) - sy;
  const left = Math.round((width - paintedWidth * scale) / 2 + (sx - x0) * scale);
  const top = Math.round(0.9 * height - paintedHeight * scale + (sy - y0) * scale);
  const scaledWidth = Math.round(sw * scale);
  const scaledHeight = Math.round(sh * scale);
  const crop = await sharp(Buffer.from(pixels), { raw: { width, height, channels: 4 } })
    .extract({ left: sx, top: sy, width: sw, height: sh })
    .resize(scaledWidth, scaledHeight)
    .png()
    .toBuffer();
  const clipLeft = Math.max(0, -left);
  const clipTop = Math.max(0, -top);
  const clipped = await sharp(crop)
    .extract({
      left: clipLeft,
      top: clipTop,
      width: Math.min(scaledWidth - clipLeft, width - Math.max(0, left)),
      height: Math.min(scaledHeight - clipTop, height - Math.max(0, top)),
    })
    .png()
    .toBuffer();
  return sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite([{ input: clipped, left: Math.max(0, left), top: Math.max(0, top) }]);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const originalsDir = process.argv[2];
  if (!originalsDir) {
    console.error('Usage: node frontend/scripts/build-landing-assets.mjs <originalsDir>');
    process.exit(1);
  }

  await mkdir(outputDir, { recursive: true });
  let sourceTotal = 0;
  let outputTotal = 0;
  for (const [name, params] of Object.entries(dishes)) {
    const source = join(originalsDir, `${name}.jpg`);
    const sourceBytes = (await stat(source)).size;
    const { data, info } = await sharp(source)
      .resize(size, size)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const pixels = new Uint8ClampedArray(data);
    const bounds = keyPix(pixels, info.width, info.height, params);
    const image = params.TW
      ? await fittedImage(pixels, bounds, info.width, info.height, params.TW)
      : sharp(Buffer.from(pixels), {
          raw: { width: info.width, height: info.height, channels: 4 },
        });
    const output = await image.webp({ quality: 82, alphaQuality: 100 }).toBuffer();
    await writeFile(join(outputDir, `${name}.webp`), output);
    sourceTotal += sourceBytes;
    outputTotal += output.length;
    console.log(
      `${name.padEnd(11)} ${Math.round(sourceBytes / 1024)} KB JPEG → ${Math.round(output.length / 1024)} KB WebP`,
    );
  }
  console.log(
    `Total       ${Math.round(sourceTotal / 1024)} KB JPEG → ${Math.round(outputTotal / 1024)} KB WebP`,
  );
}
