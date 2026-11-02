import type { ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useLandingFonts } from '../../../features/landing/hooks/useLandingFonts';
import { HissaThemeProvider, useHissaTheme } from '../../theme/HissaThemeProvider';

function Bar() {
  return <StatusBar style={useHissaTheme().name === 'graphite' ? 'light' : 'dark'} />;
}

/** Root of a Hissa app route group: waits for the fonts (shared with the landing), then provides the theme. */
export function HissaRoot({ children }: { children: ReactNode }) {
  const ready = useLandingFonts();
  if (!ready) return <View style={{ flex: 1 }} />;
  return (
    <HissaThemeProvider>
      <Bar />
      {children}
    </HissaThemeProvider>
  );
}
