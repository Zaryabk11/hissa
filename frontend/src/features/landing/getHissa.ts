import { router } from 'expo-router';
import { Linking } from 'react-native';
import { GET_HISSA_URL } from './content';

/** Every "Get Hissa" button. Does nothing until GET_HISSA_URL is filled in. */
export function openGetHissa() {
  if (GET_HISSA_URL) Linking.openURL(GET_HISSA_URL).catch(() => {});
}

/** Every "See how it works" button: opens the first onboarding screen. */
export function startOnboarding() {
  router.push('/onboarding/goal');
}
