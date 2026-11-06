import { Text, View } from 'react-native';
import { hissaFonts } from '../../theme/hissaTokens';

// Bottom to top; the cream layer sits on top at offset 0.
const LAYERS = [
  { color: '#C8102E', o: 6 },
  { color: '#0B6B3A', o: 4 },
  { color: '#1A0A05', o: 2 },
  { color: '#FFF6DD', o: 0 },
] as const;

/** Urdu wordmark drawn as four stacked offset layers (red, green, ink, cream). The Urdu face is a stand-in. */
export function Wordmark({ size = 64 }: { size?: number }) {
  const k = size / 64;
  const w = size * 2;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Hissa" style={{ width: w + 6 * k, height: size * 1.6 + 6 * k }}>
      {LAYERS.map((l) => (
        <Text
          key={l.color}
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={{ position: 'absolute', left: l.o * k, top: l.o * k, width: w, textAlign: 'center', color: l.color, fontFamily: hissaFonts.urdu700, fontSize: size, lineHeight: size * 1.6 }}
        >
          {'حصہ'}
        </Text>
      ))}
    </View>
  );
}
