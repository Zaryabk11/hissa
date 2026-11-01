export type SectionId = 'top' | 'how' | 'features' | 'buddy' | 'faq' | 'join';

export const content = {
  nav: {
    homeLabel: 'Hissa, back to top',
    links: [
      { id: 'how', label: 'How it works' },
      { id: 'features', label: 'Features' },
      { id: 'buddy', label: 'Buddy' },
      { id: 'faq', label: 'FAQ' },
    ] as { id: SectionId; label: string }[],
    cta: 'Get Hissa',
  },
  hero: {
    badge: 'Made for desi food, not for diets',
    words: ['One more', 'roti is', 'fine.'],
    body: 'Snap your plate. Hissa tells you your portion in roti and katori, quietly keeping calories in the background. Like a friend at the dastarkhwan, not a diet app.',
    primary: 'Get Hissa',
    secondary: 'See how it works',
  },
  marquee: ['Roti', 'Katori', 'Karahi', 'Biryani', 'Daal', 'Nihari', 'Raita', 'Paratha', 'Sabzi', 'Haleem'],
  idea: {
    eyebrow: 'The idea',
    titleBefore: 'Your ',
    titleAccent: 'hissa',
    titleAfter: ' is your share. Not a number you owe, not a score to beat.',
    pillars: [
      { n: '01', t: 'Portions, not points', d: 'Hissa speaks in katori and roti, the way your kitchen already does.' },
      { n: '02', t: 'Honest about guessing', d: 'Every number is an estimate, and Hissa asks when it is not sure.' },
      {
        n: '03',
        t: 'Kind on a heavy day',
        d: 'Over budget? You get a lighter plate and a gentle word, never a red warning.',
      },
    ],
  },
  how: {
    title: ['Three taps.', 'One plate.'],
    steps: [
      {
        n: '01 Snap',
        t: 'Put your plate in the frame',
        d: 'Karahi, biryani, nihari, whatever is on the table. No weighing, no typing.',
      },
      {
        n: '02 Confirm',
        t: "Tap what's right, fix what's off",
        d: "Hissa asks when it isn't sure. It never pretends to be.",
      },
      {
        n: '03 Eat',
        t: 'Get your hissa for the plate',
        d: 'One katori, one and a half roti. Big day? You get a lighter plate, kindly.',
      },
    ],
    snapPlaceholder: 'photo: your thali',
    chips: [
      { label: 'Chicken karahi', portion: '1 katori', selected: true },
      { label: 'Roti', portion: 'x2', selected: false },
    ],
    question: 'Daal or haleem?',
    plateLabel: 'Plate split into three wedges, one highlighted',
  },
  features: {
    eyebrow: 'Inside the app',
    title: 'Quiet by design',
    budget: {
      t: "A budget you don't have to read",
      d: "Calories stay in the background, always marked as an estimate. You see what's left today.",
      value: '950',
      unit: 'kcal left',
      label: 'About 950 kcal left today, an estimate',
    },
    week: {
      t: 'A week, not a day',
      d: 'Lunch is your big meal and it fits. Hissa reads the pattern and says so in plain words.',
      bars: [129, 143, 114, 68, 40, 40, 40],
      todayIndex: 3,
      label: 'Bar chart of the week: three past days, today highlighted, three days still to come',
    },
    dishes: {
      t: 'Knows your dishes',
      d: 'Counts in katori and roti, and asks when it is unsure between two lookalikes.',
      chips: ['Biryani', 'Nihari', 'Haleem', 'Daal', 'Karahi', 'Sabzi', 'Paratha', 'Chai'],
    },
    checkin: {
      t: 'How did lunch sit?',
      d: 'A two-tap check-in on energy and stomach. Over time it learns what works for you.',
      options: ['Low', 'Okay', 'Good'],
      selectedIndex: 2,
    },
  },
  buddy: {
    eyebrow: 'Buddy',
    title: 'Log together. Keep one streak.',
    body: 'Pair with a friend, a sibling, a spouse. You only see that they logged, never what they ate. A nudge when they forget, no judgement when they do.',
    streak: '12',
    days: 'days together',
    dots: { filled: 6, total: 7 },
    label: '12 days together, 6 of 7 dots filled',
    cta: 'Bring your buddy',
  },
  faq: {
    title: 'Fair questions',
    items: [
      {
        q: 'Is Hissa a diet app?',
        a: "No. There are no red numbers, no streak shaming and no food rules. Hissa shows you a sensible portion of what you're already eating.",
      },
      {
        q: 'How accurate are the numbers?',
        a: 'They are estimates and always labelled that way. When Hissa is unsure between two dishes, it asks you instead of guessing.',
      },
      {
        q: 'Can my buddy see what I eat?',
        a: 'No. Your buddy only sees that you logged a meal, not what was on the plate.',
      },
      {
        q: 'Which foods does it understand?',
        a: 'Built for desi home cooking and restaurant food first: karahi, biryani, daal, nihari, sabzi, paratha and more.',
      },
    ],
  },
  cta: {
    title: 'Pull up a chair.',
    body: 'Snap your first plate. Your hissa is ready in seconds.',
    primary: 'Get Hissa',
    secondary: 'See how it works',
  },
  footer: {
    disclaimer: "All numbers in Hissa are estimates. Hissa isn't medical advice.",
    privacy: 'Privacy',
    copyright: '© 2026 Hissa',
    tagline: 'Made for the dastarkhwan',
    wordmark: 'hissa',
  },
};
