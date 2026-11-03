import { Stack } from 'expo-router';
import { useHissaTheme } from '../../src/shared/theme/HissaThemeProvider';
import { HissaRoot } from '../../src/shared/ui/hissa/HissaRoot';

function Frame() {
  return <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: useHissaTheme().bg } }} />;
}

// Meal history and meal detail. Outside (tabs), so there is no tab bar here.
export default function MealsLayout() {
  return (
    <HissaRoot>
      <Frame />
    </HissaRoot>
  );
}
