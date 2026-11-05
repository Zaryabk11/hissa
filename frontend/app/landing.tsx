import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { LandingPage } from '../src/features/landing/LandingPage';
import { useLandingFonts } from '../src/features/landing/hooks/useLandingFonts';
import { landingColors } from '../src/shared/theme/landingTokens';

// The landing is the scroll-driven page in public/landing-site (built from scrollcraft/builds/hissa).
// Web embeds it. Native loads it in a WebView: from EXPO_PUBLIC_LANDING_URL if set (use this for release builds),
// otherwise from the Expo dev server that is serving this app.
const EXPLORE = 'hissa:explore';
const PAGE = '/landing-site/index.html';
const devHost = Constants.expoConfig?.hostUri;
const nativeUrl = process.env.EXPO_PUBLIC_LANDING_URL ?? (devHost ? `http://${devHost}${PAGE}` : null);

function WebLanding() {
  const router = useRouter();
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data === EXPLORE) router.replace('/(auth)/sign-in');
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [router]);
  return (
    <iframe
      title="Hissa"
      src={PAGE}
      style={{ display: 'block', border: 0, width: '100%', height: '100dvh', background: landingColors.bg }}
    />
  );
}

function NativeLanding({ uri }: { uri: string }) {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const origin = uri.split('/landing-site')[0];
  return (
    <View style={{ flex: 1, backgroundColor: landingColors.bg, paddingTop: top }}>
      <StatusBar style="light" />
      <WebView
        source={{ uri }}
        style={{ flex: 1, backgroundColor: landingColors.bg }}
        originWhitelist={['*']}
        onMessage={(e) => e.nativeEvent.data === EXPLORE && router.replace('/(auth)/sign-in')}
        allowsInlineMediaPlayback
        // Anything outside the landing's own origin is blocked rather than opened inside the app.
        onShouldStartLoadWithRequest={(r) => r.url.startsWith(origin) || r.url === 'about:blank'}
      />
    </View>
  );
}

// Old React Native landing. Only used by a native build that has no landing URL.
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
  if (Platform.OS === 'web') return <WebLanding />;
  return nativeUrl ? <NativeLanding uri={nativeUrl} /> : <LegacyLanding />;
}
