import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useHissaTheme } from '../../theme/HissaThemeProvider';

/** Faint gingham tablecloth and a warm glow behind a screen. No grain; the thali cutout asset does not exist yet, so none is drawn. */
export function Backdrop() {
  const t = useHissaTheme();
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="gingham" width={48} height={48} patternUnits="userSpaceOnUse">
            <Rect x={0} y={0} width={24} height={48} fill={t.ink} fillOpacity={0.05} />
            <Rect x={0} y={0} width={48} height={24} fill={t.ink} fillOpacity={0.05} />
          </Pattern>
          <RadialGradient id="glow" cx="50%" cy="0%" rx="80%" ry="55%">
            <Stop offset="0" stopColor={t.surf} stopOpacity={t.name === 'dhoop' ? 0.55 : 0.3} />
            <Stop offset="1" stopColor={t.surf} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#gingham)" />
        <Rect width="100%" height="100%" fill="url(#glow)" />
      </Svg>
    </View>
  );
}
