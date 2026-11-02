import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// expo-secure-store has no web implementation (its web module is empty), so the browser falls back to
// AsyncStorage (localStorage). shortcut: web tokens are not encrypted at rest, add httpOnly cookies if web ships.
const web = Platform.OS === 'web';

export const secureStorage = {
  getItem: (key: string): Promise<string | null> => (web ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key)),
  setItem: (key: string, value: string): Promise<void> => (web ? AsyncStorage.setItem(key, value) : SecureStore.setItemAsync(key, value)),
  removeItem: (key: string): Promise<void> => (web ? AsyncStorage.removeItem(key) : SecureStore.deleteItemAsync(key)),
};
