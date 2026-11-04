import type { ProteinType } from '../core/api';

export const avoidsContent = {
  title: "Anything you don't eat?",
  sub: "We'll keep these out of your recipes. Skip if nothing.",
  cta: 'Continue',
  skip: 'Skip',
  proteins: 'Meat and more',
  dishes: 'Dishes',
  search: 'Search dishes',
  selected: 'Selected',
  profileTitle: 'Foods I avoid',
  save: 'Save',
  saving: 'Saving…',
  saved: 'Saved.',
  saveError: 'Could not save. Try again.',
  loadError: 'Could not load your list.',
};

export const PROTEINS: { id: ProteinType; label: string }[] = [
  { id: 'beef', label: 'Beef' },
  { id: 'mutton', label: 'Mutton' },
  { id: 'chicken', label: 'Chicken' },
  { id: 'fish', label: 'Fish' },
  { id: 'egg', label: 'Egg' },
  { id: 'veg', label: 'Vegetarian' },
];

// The catalog endpoint needs sign-in, so onboarding uses this fixed list.
export const ONBOARDING_DISHES = [
  { slug: 'karela', name: 'Karela' },
  { slug: 'baingan', name: 'Baingan' },
  { slug: 'bhindi', name: 'Bhindi' },
  { slug: 'kaleji', name: 'Kaleji' },
  { slug: 'paye', name: 'Paye' },
  { slug: 'machli', name: 'Machli' },
  { slug: 'kofta', name: 'Kofta' },
  { slug: 'nihari', name: 'Nihari' },
  { slug: 'haleem', name: 'Haleem' },
  { slug: 'lobia', name: 'Lobia' },
  { slug: 'saag', name: 'Saag' },
  { slug: 'ghiya', name: 'Ghiya' },
];
