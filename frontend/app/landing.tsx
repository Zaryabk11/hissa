import { StatusBar } from 'expo-status-bar';
import { Platform, View } from 'react-native';
import { LandingPage } from '../src/features/landing/LandingPage';
import { useLandingFonts } from '../src/features/landing/hooks/useLandingFonts';
import { landingColors } from '../src/shared/theme/landingTokens';

// The website landing is the scroll-driven page in public/landing-site (built from scrollcraft/builds/hissa).
function WebLanding() {
  return (
    <iframe
      title="Hissa"
      src="/landing-site/index.html"
      style={{ display: 'block', border: 0, width: '100%', height: '100dvh', background: landingColors.bg }}
    />
  );
}

// Dark styling is scoped to this route; the rest of the app stays light.
function LegacyLanding() {
  const ready = useLandingFonts();
  if (!ready) return <View style={{ flex: 1, backgroundColor: landingColors.bg }} />;
  return (
    <>
      <StatusBar style="light" />
      <LandingPage />
    </>
  );
}

export default function Landing() {
  return Platform.OS === 'web' ? <WebLanding /> : <LegacyLanding />;
}
