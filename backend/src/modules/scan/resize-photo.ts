import sharp from 'sharp';
import { ValidationError } from '../../shared/errors';

const MAX_SIDE = 1024;

// JPEG, longest side at most MAX_SIDE, EXIF orientation applied, never enlarged.
export async function resizePhoto(input: Buffer): Promise<Buffer> {
  try {
    return await sharp(input)
      .rotate()
      .resize(MAX_SIDE, MAX_SIDE, { fit: 'inside', withoutEnlargement: true })
      .jpeg()
      .toBuffer();
  } catch {
    throw new ValidationError('Unreadable image');
  }
}
