import { z } from 'zod';

export const MAX_IMAGE_BYTES = 6_000_000;

export const scanBodySchema = z.object({
  image: z
    .string()
    .min(1, 'image is required')
    .refine((s) => !s.startsWith('data:'), 'Send raw base64 without a data: prefix')
    .refine((s) => Buffer.from(s, 'base64').length > 0, 'image is empty')
    .refine((s) => Buffer.byteLength(s, 'base64') <= MAX_IMAGE_BYTES, 'image is too large'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

export type ScanBody = z.infer<typeof scanBodySchema>;
