import { z } from 'zod';
export const inviteCodeSchema = z.string().regex(/^[A-Z0-9]{6}$/, 'Invalid invite code');
export const inviteParamsSchema = z.object({ code: inviteCodeSchema });
