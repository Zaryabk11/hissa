import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Dabbu } from '../../shared/ui/hissa/Dabbu';
import { SpeechBubble } from '../../shared/ui/hissa/SpeechBubble';
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
      <View style={{ paddingTop: 24, paddingHorizontal: 12, alignItems: 'center' }}>
        <Dabbu mood="oops" size={96} />
        <HissaText variant="title" accessibilityRole="header" style={{ marginTop: 20, textAlign: 'center' }}>
          {c.noPlate.title}
        </HissaText>
        <View style={{ marginTop: 16, marginLeft: 0 }}>
          <SpeechBubble>{c.noPlate.body}</SpeechBubble>
        </View>
      </View>
    </HissaScreen>
  );
}
