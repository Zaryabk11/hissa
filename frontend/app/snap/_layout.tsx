import { Redirect, Stack } from 'expo-router';
import { snapsEnabled } from '../../src/shared/flags';
import { useHissaTheme } from '../../src/shared/theme/HissaThemeProvider';
import { HissaRoot } from '../../src/shared/ui/hissa/HissaRoot';

function Frame() {
  return <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: useHissaTheme().bg } }} />;
}

// The snap viewer. Outside (tabs), so there is no tab bar here. With snaps off the route is not reachable.
export default function SnapLayout() {
  if (!snapsEnabled) return <Redirect href="/(tabs)/social" />;
  return (
    <HissaRoot>
      <Frame />
    </HissaRoot>
  );
}
