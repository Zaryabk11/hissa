import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="today" options={{ title: 'Today' }} />
      <Tabs.Screen name="scan" options={{ title: 'Scan' }} />
      <Tabs.Screen name="feel" options={{ title: 'Food & Feel' }} />
      <Tabs.Screen name="buddy" options={{ title: 'Buddy' }} />
    </Tabs>
  );
}
