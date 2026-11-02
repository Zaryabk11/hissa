import { useRouter } from 'expo-router';
import { useEffect } from 'react';
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
import { CloseButton } from './CloseButton';
import { scanContent as c } from './content';
import { mockRecognise } from './mockRecognise';
import { newItem, setItems, useScan } from './store';

const PHOTO = 300;
const BAND = 130;

/** Screen h. The captured photo with a lime sweep while the mock recognition runs; reduced motion shows a still band. */
export function ScanningScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { photoUri, noPlate } = useScan();
  const reduced = useReducedMotion();
  const y = useSharedValue(-BAND);

  useEffect(() => {
    if (!photoUri) {
      router.replace('/(tabs)/scan');
      return;
    }
    let live = true;
    mockRecognise(photoUri, noPlate).then((found) => {
      if (!live) return;
      if (found.length === 0) router.replace('/no-plate');
      else {
        setItems(found.map(newItem));
        router.replace('/review');
      }
    });
    return () => {
      live = false;
    };
  }, [photoUri, noPlate, router]);

  useEffect(() => {
    y.set(reduced ? 0 : withRepeat(withTiming(height, { duration: 3200, easing: Easing.out(Easing.quad) }), -1));
  }, [reduced, height, y]);
  const sweep = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));

  return (
    <HissaThemeProvider theme={graphite}>
      <View accessible accessibilityRole="progressbar" accessibilityLabel={c.scanning.title} accessibilityState={{ busy: true }} style={{ flex: 1, backgroundColor: graphite.bg }}>
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
            {c.scanning.title}
          </HissaText>
          <HissaText variant="caption" style={{ marginTop: 4 }}>
            {c.scanning.sub}
          </HissaText>
        </View>
        <View style={{ position: 'absolute', top: insets.top + 12, right: 20 }}>
          <CloseButton onPhoto onPress={() => router.back()} />
        </View>
      </View>
    </HissaThemeProvider>
  );
}
