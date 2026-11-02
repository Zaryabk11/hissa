import type { BuddyStatus } from './api/buddy';

export type BuddyView =
  | { kind: 'none' }
  | { kind: 'pending'; code: string }
  | {
      kind: 'active';
      streak: number;
      ownLoggedToday: boolean;
      buddyLoggedToday: boolean;
      canNudge: boolean;
      unreadNudge: boolean;
    };

// Builds the view from the whitelisted status fields only, so nothing else can reach the screen.
export function buddyView(status: BuddyStatus): BuddyView {
  if (status.pairStatus === 'pending' && status.pendingInviteCode)
    return { kind: 'pending', code: status.pendingInviteCode };
  if (status.pairStatus !== 'active') return { kind: 'none' };
  const buddyLoggedToday = status.buddyLoggedToday === true;
  return {
    kind: 'active',
    streak: status.streak,
    ownLoggedToday: status.ownLoggedToday,
    buddyLoggedToday,
    canNudge: !buddyLoggedToday,
    unreadNudge: status.unreadNudge,
  };
}

export function normalizeCode(input: string): string | null {
  const code = input.trim().toUpperCase();
  return /^[A-Z0-9]{6}$/.test(code) ? code : null;
}
