import sharp from 'sharp';
import { ValidationError } from '../../shared/errors';
import { logger } from '../../shared/logger';

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
