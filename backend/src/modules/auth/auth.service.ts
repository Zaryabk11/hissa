// The middleware has already authenticated this id; no database read is needed.
export function createAuthService() {
  return {
    async getCurrentUser(userId: string): Promise<{ id: string }> {
      return { id: userId };
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
