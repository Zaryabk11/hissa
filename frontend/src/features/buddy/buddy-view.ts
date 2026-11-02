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
      nudgeSent: boolean;
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
    canNudge: !buddyLoggedToday && !status.nudgedToday,
    nudgeSent: !buddyLoggedToday && status.nudgedToday,
    unreadNudge: status.unreadNudge,
  };
}

export function normalizeCode(input: string): string | null {
  const code = input.trim().toUpperCase();
  return /^[A-Z0-9]{6}$/.test(code) ? code : null;
}

// apiAuthed throws Error('<METHOD> <path> failed with <status>'); null means no HTTP answer (offline, signed out).
export function httpStatus(error: unknown): number | null {
  const match = error instanceof Error ? /failed with (\d{3})$/.exec(error.message) : null;
  return match ? Number(match[1]) : null;
}
