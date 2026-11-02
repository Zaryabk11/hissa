import { createContext, useContext, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { graphite, paper, type HissaTheme } from './hissaTokens';

const ThemeContext = createContext<HissaTheme>(graphite);

/** Follows the system colour scheme (dark is Graphite, light is Paper) unless `theme` forces one, as the camera does. */
export function HissaThemeProvider({ children, theme }: { children: ReactNode; theme?: HissaTheme }) {
  const scheme = useColorScheme();
  return <ThemeContext.Provider value={theme ?? (scheme === 'light' ? paper : graphite)}>{children}</ThemeContext.Provider>;
}

export const useHissaTheme = () => useContext(ThemeContext);
