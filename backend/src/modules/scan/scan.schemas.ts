import { z } from 'zod';

export const MAX_IMAGE_BYTES = 6_000_000;

export const scanBodySchema = z.object({
  image: z
    .string()
    .min(1, 'image is required')
    .refine((s) => Buffer.byteLength(s, 'base64') <= MAX_IMAGE_BYTES, 'image is too large'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

export type ScanBody = z.infer<typeof scanBodySchema>;
