import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree';
import { useFonts } from 'expo-font';
import { landingFonts } from '../../../shared/theme/landingTokens';

/** Returns true once ready. A font error also opens the gate so the page falls back to system fonts. */
export function useLandingFonts(): boolean {
  const [loaded, error] = useFonts({
    [landingFonts.display700]: BricolageGrotesque_700Bold,
    [landingFonts.display800]: BricolageGrotesque_800ExtraBold,
    [landingFonts.body400]: Figtree_400Regular,
    [landingFonts.body500]: Figtree_500Medium,
    [landingFonts.body600]: Figtree_600SemiBold,
    [landingFonts.body700]: Figtree_700Bold,
  });
  return loaded || error != null;
}
