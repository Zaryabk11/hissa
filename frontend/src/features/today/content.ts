// Today copy, from docs/design/Hissa Screens.html (screens e, k, o). Every number is an estimate.
export const todayContent = {
  greeting: (name: string | null) => (name ? `Salaam, ${name}` : 'Salaam'),
  profile: 'Open profile',
  ring: {
    left: 'left',
    forToday: 'for today',
    estimate: 'About, an estimate',
    label: (n: string, unit: string) => `About ${n} kcal ${unit}, an estimate`,
    atBudget: "You're at today's budget. A lighter plate next is a kind choice.",
  },
  meals: {
    title: 'Meals today',
    kcal: (n: string) => `About ${n} kcal, an estimate`,
  },
  streak: {
    days: (n: number) => `Shared streak: ${n} ${n === 1 ? 'day' : 'days'}`,
    pending: (buddy: string) => `You logged, ${buddy} hasn't yet`,
    both: (buddy: string) => `You and ${buddy} both logged today`,
    buddyOnly: (buddy: string) => `${buddy} logged today`,
    neither: (buddy: string) => `You and ${buddy} have not logged yet`,
    buddyFallback: 'your buddy',
    nudge: 'Nudge',
    nudgeLabel: (buddy: string) => `Nudge ${buddy}`,
    nudged: 'Nudged today',
    nudgeError: 'Could not send the nudge. Try again.',
    open: 'Open buddy',
    invite: {
      title: 'Streaks are better together',
      body: 'Invite a buddy. They only see that you logged, never what you ate.',
      cta: 'Invite a buddy',
    },
    pendingInvite: {
      title: 'Your invite is waiting',
      body: 'Share the code from the buddy tab.',
      cta: 'Open buddy',
    },
  },
  checkin: {
    title: 'How did your last meal sit?',
    body: 'Two quick taps on energy and stomach.',
    cta: 'Check in',
  },
  empty: {
    title: 'Your plate starts here',
    body: 'Snap what is in front of you. Hissa will suggest a portion.',
    cta: 'Scan my plate',
  },
  refresh: {
    cta: 'Refresh',
    busy: 'Refreshing…',
    failed: 'Could not refresh. Showing what we had.',
  },
  loadError: 'Could not load today. Check your connection and try again.',
  retry: 'Try again',
  loading: 'Loading today',
} as const;
