import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../shared/errors';
import { resizePhoto } from '../resize-photo';

const png = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: '#c33' } })
    .png()
    .toBuffer();

describe('resizePhoto', () => {
  it('shrinks the longest side to 1024 and returns a JPEG', async () => {
    const meta = await sharp(await resizePhoto(await png(2000, 1000))).metadata();
    expect(meta).toMatchObject({ format: 'jpeg', width: 1024, height: 512 });
  });

  it('never enlarges a small image', async () => {
    const meta = await sharp(await resizePhoto(await png(400, 300))).metadata();
    expect(meta).toMatchObject({ width: 400, height: 300 });
  });

  it('rejects bytes that are not an image', async () => {
    await expect(resizePhoto(Buffer.from('not an image'))).rejects.toThrow(
      new ValidationError('Unreadable image'),
    );
  });
});
