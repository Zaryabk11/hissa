export const canUseDraft = (finished: boolean, ownerId: string | null, userId: string) =>
  finished && (!ownerId || ownerId === userId);
