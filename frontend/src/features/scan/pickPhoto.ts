import * as ImagePicker from 'expo-image-picker';

/** Opens the gallery (the browser's file picker on web). Resolves to the photo uri, or null if cancelled or it failed. */
export async function pickPhoto(): Promise<string | null> {
  try {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    return r.canceled ? null : r.assets[0].uri;
  } catch {
    return null; // shortcut: a failed pick looks like a cancel, add a message when real photos matter
  }
}
