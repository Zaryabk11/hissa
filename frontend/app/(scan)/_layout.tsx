import { Stack } from 'expo-router';
import { useHissaTheme } from '../../src/shared/theme/HissaThemeProvider';
import { HissaRoot } from '../../src/shared/ui/hissa/HissaRoot';

function Frame() {
  return <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: useHissaTheme().bg } }} />;
}

// The scan flow after the camera. Outside (tabs), so there is no tab bar on these screens.
export default function ScanLayout() {
  return (
    <HissaRoot>
      <Frame />
    </HissaRoot>
  );
}
