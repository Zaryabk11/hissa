import * as ImagePicker from 'expo-image-picker';

/** Opens the gallery with the image bytes needed by the scan API. */
export async function pickPhoto(): Promise<{ uri: string; base64: string; mimeType: string } | null> {
  try {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, base64: true });
    if (r.canceled || !r.assets[0]?.base64) return null;
    const asset = r.assets[0];
    return { uri: asset.uri, base64: (asset.base64 ?? '').replace(/^data:[^,]+,/, ''), mimeType: asset.mimeType === 'image/png' || asset.mimeType === 'image/webp' ? asset.mimeType : 'image/jpeg' };
  } catch {
    return null;
  }
}
