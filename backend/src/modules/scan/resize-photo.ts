import sharp from 'sharp';
import { ValidationError } from '../../shared/errors';

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
  } catch {
    throw new ValidationError('Unreadable image');
  }
}
