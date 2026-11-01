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
};
