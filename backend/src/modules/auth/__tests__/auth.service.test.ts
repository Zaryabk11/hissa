import { describe, expect, it } from 'vitest';
import { createAuthService } from '../auth.service';

describe('auth service', () => {
  it('returns only the authenticated user id', async () => {
    const service = createAuthService();
    await expect(service.getCurrentUser('u1')).resolves.toEqual({ id: 'u1' });
  });
});
