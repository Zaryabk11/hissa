import { Redirect } from 'expo-router';

// shortcut: no session check yet, so everyone lands on Today. Redirect to /(auth)/sign-in once auth exists.
export default function Index() {
  return <Redirect href="/(tabs)/today" />;
}
