import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { graphite } from '../../shared/theme/hissaTokens';
import { HissaThemeProvider } from '../../shared/theme/HissaThemeProvider';
import { HissaText } from '../../shared/ui/hissa/HissaText';
import { PrimaryButton } from '../../shared/ui/hissa/PrimaryButton';
import { getCatalog, scanPhoto } from '../core/api';
import { setCatalog } from '../nutrition/catalog';
import { CloseButton } from './CloseButton';
import { scanContent as c } from './content';
import { isNoPlateResult, reviewItemsFromScan } from './scanPayload';
import { setItems, setManualReason, useScan } from './store';

const PHOTO = 300;
const BAND = 130;
const BAR_MS = 20_000; // the bar eases toward 92% over this long, then waits for the real answer
const MATCHING_AFTER_S = 4;
const SLOW_AFTER_S = 12;

/** Screen h. The captured photo with a lime sweep while the API recognises the plate. */
export function ScanningScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { photoUri, image, mimeType } = useScan();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const reduced = useReducedMotion();
  const y = useSharedValue(-BAND);
  const progress = useSharedValue(0);
  const [seconds, setSeconds] = useState(0);

  // The wait is mostly the model, so the bar is an honest "still working" cue, not a measured percentage.
  useEffect(() => {
    if (error) return;
    progress.set(0);
    progress.set(withTiming(0.92, { duration: BAR_MS, easing: Easing.out(Easing.cubic) }));
    const start = Date.now();
    const tick = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(tick);
  }, [attempt, error, progress]);

  useEffect(() => {
    if (!photoUri || !image) {
      router.replace('/(tabs)/scan');
      return;
    }
    let live = true;
    Promise.all([getCatalog(), scanPhoto(image, mimeType)])
      .then(([catalog, result]) => {
        if (!live) return;
        setCatalog(catalog.dishes);
        if (result.mode === 'manual') {
          setManualReason(result.reason);
          setItems([]);
          router.replace('/review');
        } else if (isNoPlateResult(result.items)) router.replace('/no-plate');
        else {
          setItems(reviewItemsFromScan(result.items));
          setManualReason(null);
          router.replace('/review');
        }
      })
      .catch(() => {
        if (live) setError('Could not scan this photo. Please try again.');
      });
    return () => {
      live = false;
    };
  }, [photoUri, image, mimeType, router, attempt]);

  useEffect(() => {
    y.set(reduced ? 0 : withRepeat(withTiming(height, { duration: 3200, easing: Easing.out(Easing.quad) }), -1));
  }, [reduced, height, y]);
  const sweep = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  const fill = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));
  const stage = seconds >= SLOW_AFTER_S ? c.scanning.slow : seconds >= MATCHING_AFTER_S ? c.scanning.matching : c.scanning.sub;

  return (
    <HissaThemeProvider theme={graphite}>
      <View accessible accessibilityRole="progressbar" accessibilityLabel={c.scanning.title} accessibilityState={{ busy: !error }} style={{ flex: 1, backgroundColor: graphite.bg }}>
        <View style={{ marginTop: Math.max(insets.top, 24) + 150, alignSelf: 'center' }}>
          {photoUri && (
            <Image accessibilityLabel={c.scanning.photo} source={{ uri: photoUri }} style={{ width: PHOTO, height: PHOTO, borderRadius: PHOTO / 2, borderWidth: 1, borderColor: 'rgba(255,255,255,.4)' }} />
          )}
        </View>
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', left: 0, right: 0, top: reduced ? Math.max(insets.top, 24) + 150 + PHOTO / 2 - BAND : 0, height: BAND, backgroundColor: 'rgba(212,255,58,.25)', borderBottomWidth: 3, borderBottomColor: graphite.pri }, sweep]}
        />
        <View style={{ position: 'absolute', left: 20, right: 20, alignSelf: 'center', maxWidth: 440, bottom: Math.max(insets.bottom, 24) + 40, borderRadius: 24, backgroundColor: graphite.surf, borderWidth: 1, borderColor: graphite.hair, padding: 20, alignItems: 'center' }}>
          <HissaText variant="title" accessibilityRole="header" style={{ fontSize: 22, lineHeight: 28 }}>
            {error ?? c.scanning.title}
          </HissaText>
          <HissaText variant="caption" style={{ marginTop: 4 }}>
            {error ? <PrimaryButton label="Retry scan" onPress={() => { setError(null); setSeconds(0); setAttempt((n) => n + 1); }} /> : stage}
          </HissaText>
          {!error && (
            <View style={{ alignSelf: 'stretch', height: 6, borderRadius: 3, marginTop: 16, overflow: 'hidden', backgroundColor: graphite.hair }}>
              <Animated.View style={[{ height: 6, borderRadius: 3, backgroundColor: graphite.pri }, fill]} />
            </View>
          )}
        </View>
        <View style={{ position: 'absolute', top: insets.top + 12, right: 20 }}>
          <CloseButton onPhoto onPress={() => router.back()} />
        </View>
      </View>
    </HissaThemeProvider>
  );
}
