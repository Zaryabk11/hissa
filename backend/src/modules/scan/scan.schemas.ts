import type { z } from 'zod';
import { imageBodySchema } from '../../shared/image';

export const scanBodySchema = imageBodySchema;

export type ScanBody = z.infer<typeof scanBodySchema>;
