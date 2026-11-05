import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useHissaTheme } from '../../../shared/theme/HissaThemeProvider';

/** A plate inside a dashed ring with a marker near the top: the check-in comes a while after the meal. Decorative. */
export function PlateClock({ size = 104 }: { size?: number }) {
  const t = useHissaTheme();
  return (
    <View aria-hidden>
      <Svg width={size} height={size} viewBox="0 0 104 104" fill="none">
        <Circle cx={52} cy={52} r={48} stroke={t.rim} strokeWidth={1.5} strokeDasharray="2 6" strokeLinecap="round" />
        <Circle cx={52} cy={52} r={32} fill={t.tint} stroke={t.hair} strokeWidth={1.5} />
        <Circle cx={52} cy={52} r={21} stroke={t.rim} strokeWidth={1.5} />
        <Path d="M44 44v16M40 44v6a4 4 0 0 0 8 0v-6M62 44c-4 2-5 8-2 12v4" stroke={t.tintInk} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={84} cy={19} r={7} fill={t.pri} />
        <Path d="M84 15v4l2.5 1.5" stroke={t.onPri} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}
