import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useHissaTheme } from '../../theme/HissaThemeProvider';
import { HissaText } from './HissaText';
import { sticker } from './sticker';

/** Cream bordered bubble tied to Dabbu (tail on the left). Announced politely when its text changes. */
export function SpeechBubble({ children }: { children: ReactNode }) {
  const t = useHissaTheme();
  return (
    <View accessibilityLiveRegion="polite" aria-live="polite" style={{ flexShrink: 1, marginLeft: 8 }}>
      <View style={[sticker(t, 3), { borderRadius: 20, backgroundColor: t.surf, paddingVertical: 10, paddingHorizontal: 14 }]}>
        {typeof children === 'string' ? <HissaText variant="label">{children}</HissaText> : children}
      </View>
      <View
        style={{
          position: 'absolute',
          left: -9,
          top: 16,
          width: 14,
          height: 14,
          backgroundColor: t.surf,
          borderLeftWidth: 2,
          borderBottomWidth: 2,
          borderColor: t.line,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  );
}
