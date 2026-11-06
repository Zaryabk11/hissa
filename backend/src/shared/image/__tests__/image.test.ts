import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';
import { ValidationError } from '../../errors';
import { logger } from '../../logger';
import { MAX_IMAGE_BYTES, imageBodySchema, resizePhoto } from '..';

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

  it('logs the sharp error name and message when the image is unreadable', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    await resizePhoto(Buffer.from('not an image')).catch(() => {});
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      'Photo could not be decoded',
      expect.objectContaining({ error: 'Error', message: expect.any(String) }),
    );
    warn.mockRestore();
  });
});

describe('imageBodySchema', () => {
  const b64 = (bytes: number) => Buffer.alloc(bytes, 1).toString('base64');

  it('accepts the maximum size and rejects one byte over', () => {
    expect(MAX_IMAGE_BYTES).toBe(6_000_000);
    expect(
      imageBodySchema.safeParse({ image: b64(MAX_IMAGE_BYTES), mimeType: 'image/png' }).success,
    ).toBe(true);
    const r = imageBodySchema.safeParse({ image: b64(MAX_IMAGE_BYTES + 1), mimeType: 'image/png' });
    expect(r.success ? null : r.error.issues[0]?.message).toBe('image is too large');
  });
});
