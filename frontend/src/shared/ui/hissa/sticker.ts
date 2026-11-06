import { useState } from 'react';
import type { ViewStyle } from 'react-native';
import type { HissaTheme } from '../../theme/hissaTokens';

/** The sticker look: 2px border in `line` and a hard offset shadow in `drop`. */
export const sticker = (t: HissaTheme, drop = 4): ViewStyle => ({
  borderWidth: 2,
  borderColor: t.line,
  ...(drop ? { boxShadow: `${drop}px ${drop}px 0 ${t.drop}` } : {}),
});

/** Focus handlers plus an outline style, so keyboard focus is always visible. */
export function useFocusRing(t: HissaTheme) {
  const [focused, setFocused] = useState(false);
  return {
    handlers: { onFocus: () => setFocused(true), onBlur: () => setFocused(false) },
    style: (focused ? { outlineWidth: 3, outlineStyle: 'solid', outlineColor: t.ink, outlineOffset: 2 } : {}) as ViewStyle,
  };
}
