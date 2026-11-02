import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useHissaTheme } from '../../shared/theme/HissaThemeProvider';
import { HissaScreen } from '../../shared/ui/hissa/HissaScreen';
import { HissaText } from '../../shared/ui/hissa/HissaText';
import { PrimaryButton } from '../../shared/ui/hissa/PrimaryButton';
import { CloseButton } from './CloseButton';
import { scanContent as c } from './content';
import { pickPhoto } from './pickPhoto';
import { setItems, setManualReason, startScan } from './store';

/** Screen q. Nothing recognised: kind copy, back to the camera, or pick a photo instead. */
export function NoPlateScreen() {
  const router = useRouter();
  const t = useHissaTheme();
  const gallery = async () => {
    const photo = await pickPhoto();
    if (photo) {
      startScan(photo.uri, photo.base64, photo.mimeType);
      router.replace('/scanning');
    }
  };
  return (
    <HissaScreen
      actionBar={
        <View style={{ gap: 8 }}>
          <PrimaryButton label={c.noPlate.retry} onPress={() => router.navigate('/(tabs)/scan')} />
          <PrimaryButton outline label={c.noPlate.gallery} onPress={gallery} />
          <PrimaryButton outline label="Add dishes by hand" onPress={() => { setItems([]); setManualReason('not_recognised'); router.replace('/review'); }} />
        </View>
      }
    >
      <View style={{ alignItems: 'flex-end' }}>
        <CloseButton onPress={() => router.navigate('/(tabs)/today')} />
      </View>
      <View style={{ paddingTop: 48, paddingHorizontal: 12, alignItems: 'center' }}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={{ width: 96, height: 96, borderRadius: 48, borderWidth: 2, borderStyle: 'dashed', borderColor: t.rim, alignItems: 'center', justifyContent: 'center' }}
        >
          <HissaText variant="title" muted style={{ fontSize: 40, lineHeight: 48 }}>
            ?
          </HissaText>
        </View>
        <HissaText variant="title" accessibilityRole="header" style={{ marginTop: 28, textAlign: 'center' }}>
          {c.noPlate.title}
        </HissaText>
        <HissaText muted style={{ marginTop: 10, textAlign: 'center' }}>
          {c.noPlate.body}
        </HissaText>
      </View>
    </HissaScreen>
  );
}
