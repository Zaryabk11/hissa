import { createContext, useContext, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { pickTheme, raat, type HissaTheme } from './hissaTokens';

const ThemeContext = createContext<HissaTheme>(raat);

/** Follows the system colour scheme (light is Dhoop, dark is Raat) unless `theme` forces one, as the camera does. */
export function HissaThemeProvider({ children, theme }: { children: ReactNode; theme?: HissaTheme }) {
  return <ThemeContext.Provider value={pickTheme(useColorScheme(), theme)}>{children}</ThemeContext.Provider>;
}

export const useHissaTheme = () => useContext(ThemeContext);
