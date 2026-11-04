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
  week: {
    title: 'Your week so far',
    summary: (logged: number, avg: string) =>
      `Logged ${logged} of 7 days. Average about ${avg} kcal a day, an estimate.`,
    empty: 'Nothing logged this week yet. Your first meal starts the pattern.',
    seeAll: 'See all meals',
    dayLabel: (name: string, kcal: string | null) =>
      kcal ? `${name}: about ${kcal} kcal, an estimate` : `${name}: nothing logged`,
    loadError: 'Could not load your week.',
    retry: 'Try again',
    loading: 'Loading your week',
  },
  streak: {
    days: (n: number) => `Streak: ${n} ${n === 1 ? 'day' : 'days'}`,
    logged: 'You logged today',
    notYet: 'Log a meal to keep it going',
    open: 'Open social',
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
