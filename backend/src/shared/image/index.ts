import sharp from 'sharp';
import { z } from 'zod';
import { ValidationError } from '../errors';
import { logger } from '../logger';

export const MAX_IMAGE_BYTES = 6_000_000;

const MAX_SIDE = 1024;
// Reject images that decode to a huge bitmap (sharp's default is about 268 MP).
const MAX_INPUT_PIXELS = 50_000_000;

// JPEG, longest side at most MAX_SIDE, EXIF orientation applied, never enlarged.
export async function resizePhoto(input: Buffer): Promise<Buffer> {
  try {
    return await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
      .rotate()
      .resize(MAX_SIDE, MAX_SIDE, { fit: 'inside', withoutEnlargement: true })
      .jpeg()
      .toBuffer();
  } catch (err) {
    // sharp's messages carry no secrets or paths.
    const e = err instanceof Error ? err : new Error(String(err));
    logger.warn('Photo could not be decoded', { error: e.name, message: e.message });
    throw new ValidationError('Unreadable image');
  }
}

// Shared request body for endpoints that take a base64 photo.
export const imageBodySchema = z.object({
  image: z
    .string()
    .min(1, 'image is required')
    .refine((s) => !s.startsWith('data:'), 'Send raw base64 without a data: prefix')
    .refine((s) => Buffer.from(s, 'base64').length > 0, 'image is empty')
    .refine((s) => Buffer.byteLength(s, 'base64') <= MAX_IMAGE_BYTES, 'image is too large'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});
