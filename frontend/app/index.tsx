import { Redirect } from 'expo-router';

// shortcut: no session check yet, so everyone lands on the landing page. Route signed-in users to /(tabs)/today once auth exists.
export default function Index() {
  return <Redirect href="/landing" />;
}
