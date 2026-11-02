import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { graphite } from '../../shared/theme/hissaTokens';
import { HissaThemeProvider } from '../../shared/theme/HissaThemeProvider';
import { HissaText } from '../../shared/ui/hissa/HissaText';
import { PrimaryButton } from '../../shared/ui/hissa/PrimaryButton';
import { CloseButton } from './CloseButton';
import { scanContent as c } from './content';
import { pickPhoto } from './pickPhoto';
import { startScan } from './store';

const isWeb = Platform.OS === 'web';
// A browser without getUserMedia (or a machine with no camera that fails to mount) falls back to the photo picker.
const webHasNoCamera = isWeb && typeof navigator !== 'undefined' && !navigator.mediaDevices?.getUserMedia;

function Panel({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 32, gap: 12 }}>
      <HissaText variant="title" accessibilityRole="header" style={{ textAlign: 'center' }}>
        {title}
      </HissaText>
      <HissaText muted style={{ textAlign: 'center' }}>
        {body}
      </HissaText>
      <View style={{ gap: 8, marginTop: 16 }}>{children}</View>
    </View>
  );
}

function GalleryButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={c.camera.gallery}
      onPress={onPress}
      style={{ width: 48, height: 48, borderRadius: 12, borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <Rect x={4} y={5} width={16} height={14} rx={2} />
        <Circle cx={9} cy={10} r={1.5} />
        <Path d="M4 17l5-4 4 3 3-2 4 3" />
      </Svg>
    </Pressable>
  );
}

/** Screen g. Live camera with a viewfinder, or a kind panel when the camera is off or missing. Both always offer the gallery. */
export function CameraScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [mountFailed, setMountFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const analyse = (uri: string) => {
    startScan(uri);
    router.push('/scanning');
  };
  const choose = async () => {
    const uri = await pickPhoto();
    if (uri) analyse(uri);
  };
  const take = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const photo = await camera.current?.takePictureAsync({ quality: 0.6 });
      if (photo?.uri) analyse(photo.uri);
    } catch {
      // shortcut: a failed capture just lets the user tap again
    } finally {
      setBusy(false);
    }
  };

  const noCamera = webHasNoCamera || mountFailed;
  const live = !noCamera && permission?.granted === true;
  const galleryRow = <PrimaryButton outline label={c.camera.pick} onPress={choose} />;

  let body: ReactNode = null;
  if (noCamera) {
    body = <Panel title={c.camera.none.title} body={c.camera.none.body}>{galleryRow}</Panel>;
  } else if (permission && !permission.granted) {
    body = permission.canAskAgain ? (
      <Panel title={c.camera.asking.title} body={c.camera.asking.body}>
        <PrimaryButton label={c.camera.asking.allow} onPress={requestPermission} />
        {galleryRow}
      </Panel>
    ) : (
      <Panel title={c.camera.denied.title} body={isWeb ? c.camera.denied.webBody : c.camera.denied.body}>
        {!isWeb && <PrimaryButton label={c.camera.denied.settings} onPress={() => Linking.openSettings()} />}
        {galleryRow}
      </Panel>
    );
  }

  return (
    <HissaThemeProvider theme={graphite}>
      <View style={{ flex: 1, backgroundColor: graphite.bg }}>
        {live && <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" onMountError={() => setMountFailed(true)} />}
        {body}
        {live && (
          <>
            <View pointerEvents="none" style={{ ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 24 }}>
              <View style={{ width: 300, height: 300, borderRadius: 150, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,.8)' }} />
              <HissaText variant="button" style={{ fontSize: 16, lineHeight: 24, color: '#FFFFFF' }}>
                {c.camera.frame}
              </HissaText>
            </View>
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: Math.max(insets.bottom, 24) + 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 40 }}>
              <GalleryButton onPress={choose} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={c.camera.take}
                onPress={take}
                style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}
              >
                <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: '#FFFFFF' }} />
              </Pressable>
              <View style={{ width: 48 }} />
            </View>
          </>
        )}
        <View style={{ position: 'absolute', top: insets.top + 12, right: 20 }}>
          <CloseButton onPhoto onPress={() => router.navigate('/(tabs)/today')} />
        </View>
      </View>
    </HissaThemeProvider>
  );
}
