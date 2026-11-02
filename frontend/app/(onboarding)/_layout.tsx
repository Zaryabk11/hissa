import { Stack } from 'expo-router';
import { useHissaTheme } from '../../src/shared/theme/HissaThemeProvider';
import { HissaRoot } from '../../src/shared/ui/hissa/HissaRoot';

function Frame() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: useHissaTheme().bg } }} />;
}

// Onboarding has its own theme (system light/dark) and uses the landing's font files.
export default function OnboardingLayout() {
  return (
    <HissaRoot>
      <Frame />
    </HissaRoot>
  );
}
