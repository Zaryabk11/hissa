import { Tabs } from 'expo-router';
import { HissaRoot } from '../../src/shared/ui/hissa/HissaRoot';
import { TabBar } from '../../src/shared/ui/hissa/TabBar';

export default function TabsLayout() {
  return (
    <HissaRoot>
      <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="today" options={{ title: 'Today' }} />
        <Tabs.Screen name="scan" options={{ title: 'Scan' }} />
        <Tabs.Screen name="buddy" options={{ title: 'Buddy' }} />
      </Tabs>
    </HissaRoot>
  );
}
