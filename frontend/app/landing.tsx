import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { Background } from '../src/features/landing/components/Background';
import { useLandingFonts } from '../src/features/landing/hooks/useLandingFonts';
import { landingColors, landingFonts, landingType, fluid } from '../src/shared/theme/landingTokens';

// Dark styling is scoped to this route; the rest of the app stays light.
export default function Landing() {
  const ready = useLandingFonts();
  if (!ready) return <View style={{ flex: 1, backgroundColor: landingColors.bg }} />;

  const size = fluid(landingType.heroH1.min, landingType.heroH1.vw, landingType.heroH1.max);
  return (
    <View style={{ flex: 1, backgroundColor: landingColors.bg }}>
      <StatusBar style="light" />
      <Background />
      <View style={{ flex: 1, zIndex: 1, justifyContent: 'center', padding: 24 }}>
        <Text
          style={{
            fontFamily: landingFonts.display800,
            fontSize: size,
            lineHeight: size * 0.9,
            letterSpacing: size * -0.045,
            textTransform: 'uppercase',
            color: landingColors.text,
          }}
        >
          One more roti is <Text style={{ color: landingColors.lime }}>fine.</Text>
        </Text>
      </View>
    </View>
  );
}
