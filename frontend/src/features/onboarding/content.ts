// All onboarding copy, from docs/design/Hissa Screens.html (screens a to d).
export const TOTAL_STEPS = 5;

export const onboardingContent = {
  back: 'Back',
  step: (n: number) => `Step ${n} of ${TOTAL_STEPS}`,
  goal: {
    title: 'What brings you to Hissa?',
    sub: 'Pick the one that fits best. You can change it later.',
    options: [
      { id: 'lighter', title: 'Eat a little lighter', sub: 'Smaller plates, same favourite food' },
      { id: 'steady', title: 'Stay where I am', sub: 'Keep portions steady and calm' },
    ],
    cta: 'Continue',
  },
  body: {
    title: 'Tell us a little about you',
    sub: 'Only used to estimate your daily budget.',
    age: { label: 'Age', unit: 'years' },
    height: { label: 'Height', unit: '' },
    weight: { label: 'Weight', unit: 'kg' },
    sex: [
      { id: 'male', label: 'Male' },
      { id: 'female', label: 'Female' },
    ],
    decrease: (what: string) => `Decrease ${what}`,
    increase: (what: string) => `Increase ${what}`,
    cta: 'Continue',
  },
  activity: {
    title: 'How active are your days?',
    options: [
      { id: 'sitting', title: 'Mostly sitting', sub: 'Desk, driving, a short evening walk' },
      { id: 'onFeet', title: 'On my feet', sub: 'Shop, school, housework, regular walking' },
      { id: 'active', title: 'Very active', sub: 'Physical work or training most days' },
    ],
    cta: 'Continue',
  },
  budget: {
    title: 'Your daily budget',
    unit: 'kcal a day',
    estimate: 'About, an estimate',
    body: "You'll see it as roti and katori, not numbers. Calories stay in the background.",
    cta: "Let's eat",
  },
} as const;
