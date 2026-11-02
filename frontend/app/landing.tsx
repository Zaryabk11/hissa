import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { LandingPage } from '../src/features/landing/LandingPage';
import { useLandingFonts } from '../src/features/landing/hooks/useLandingFonts';
import { landingColors } from '../src/shared/theme/landingTokens';

// Dark styling is scoped to this route; the rest of the app stays light.
export default function Landing() {
  const ready = useLandingFonts();
  if (!ready) return <View style={{ flex: 1, backgroundColor: landingColors.bg }} />;
  return (
    <>
      <StatusBar style="light" />
      <LandingPage />
    </>
  );
}
