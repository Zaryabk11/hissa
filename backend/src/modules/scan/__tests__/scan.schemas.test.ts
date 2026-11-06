import { describe, expect, it } from 'vitest';
import { MAX_IMAGE_BYTES } from '../../../shared/image';
import { scanBodySchema } from '../scan.schemas';

const parse = (image: string) => scanBodySchema.safeParse({ image, mimeType: 'image/jpeg' });
const b64 = (bytes: number) => Buffer.alloc(bytes, 1).toString('base64');
const message = (image: string) => {
  const r = parse(image);
  return r.success ? null : r.error.issues[0]?.message;
};

describe('scanBodySchema', () => {
  it('accepts an image of exactly the maximum decoded size', () => {
    expect(parse(b64(MAX_IMAGE_BYTES)).success).toBe(true);
  });

  it('rejects an image one byte over the maximum', () => {
    expect(message(b64(MAX_IMAGE_BYTES + 1))).toBe('image is too large');
  });

  it('rejects a data: URL prefix', () => {
    expect(message(`data:image/jpeg;base64,${b64(10)}`)).toBe(
      'Send raw base64 without a data: prefix',
    );
  });

  it.each(['', '!!!'])('rejects an image that decodes to nothing: %j', (image) => {
    expect(parse(image).success).toBe(false);
  });

  it('rejects an unsupported mimeType', () => {
    expect(scanBodySchema.safeParse({ image: b64(10), mimeType: 'image/gif' }).success).toBe(false);
  });
});
