import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { hydrateAnswers } from '../src/features/onboarding/store';
import { hydrateMeals } from '../src/features/today/mealsStore';

export default function RootLayout() {
  // Load saved onboarding answers and meals once; Today shows its skeleton until both are in.
  useEffect(() => {
    hydrateAnswers();
    hydrateMeals();
  }, []);
  return <Stack screenOptions={{ headerShown: false }} />;
}
