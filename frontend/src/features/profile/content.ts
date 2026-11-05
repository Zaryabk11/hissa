// Profile copy. Activity levels are the four the API accepts. Numbers are always estimates.
export const profileContent = {
  back: 'Back',
  title: 'Your profile',
  loading: 'Loading your profile',
  loadError: 'Could not load your profile. Check your connection and try again.',
  retry: 'Try again',
  budget: {
    label: 'Daily budget',
    unit: 'kcal a day',
    estimate: 'About, an estimate',
    note: 'Worked out again each time you save.',
  },
  name: { label: 'Name', placeholder: 'What should we call you?' },
  goal: {
    title: 'Your goal',
    options: [
      { id: 'lose', title: 'Eat a little lighter', sub: 'Smaller plates, same favourite food' },
      { id: 'maintain', title: 'Stay where I am', sub: 'Keep portions steady and calm' },
    ],
  },
  body: {
    title: 'About you',
    age: { label: 'Age', unit: 'years' },
    height: { label: 'Height', unit: '' },
    weight: { label: 'Weight', unit: 'kg' },
    sex: [
      { id: 'male', label: 'Male' },
      { id: 'female', label: 'Female' },
    ],
    decrease: (what: string) => `Decrease ${what}`,
    increase: (what: string) => `Increase ${what}`,
  },
  activity: {
    title: 'How active are your days?',
    options: [
      { id: 'sedentary', title: 'Mostly sitting', sub: 'Desk, driving, a short evening walk' },
      { id: 'light', title: 'On my feet', sub: 'Shop, school, housework, regular walking' },
      {
        id: 'moderate',
        title: 'Often moving',
        sub: 'Exercise or heavy housework a few days a week',
      },
      { id: 'active', title: 'Very active', sub: 'Physical work or training most days' },
    ],
  },
  macros: {
    title: 'Macro targets',
    note: 'Optional daily goals in grams. Leave blank to skip. Estimates, not medical advice.',
    fields: [
      { key: 'proteinTarget', label: 'Protein' },
      { key: 'carbsTarget', label: 'Carbs' },
      { key: 'fatTarget', label: 'Fat' },
    ],
    unit: 'g',
    placeholder: 'Not set',
  },
  save: 'Save changes',
  saving: 'Saving…',
  saved: (kcal: string) => `Saved. Your budget is about ${kcal} kcal a day, an estimate.`,
  saveError: 'Could not save. Your changes are still here, so try again.',
  signOut: 'Sign out',
  signOutError: 'Could not sign out. Check your connection and try again.',
  footnote: 'Hissa gives estimates for everyday eating. It is not medical advice.',
} as const;
