import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { useHissaTheme } from '../../../shared/theme/HissaThemeProvider';

const TICKS = 72;

/** 72 ticks that drain clockwise as `fraction` (0..1, share of the budget eaten) grows. Static, so reduced motion needs no special case. */
export function BudgetRing({ fraction, label, children }: { fraction: number; label: string; children: ReactNode }) {
  const t = useHissaTheme();
  const lit = Math.round((1 - Math.max(0, Math.min(1, fraction))) * TICKS);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={{ width: 220, height: 220, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={220} height={220} viewBox="0 0 220 220" style={{ position: 'absolute' }}>
        {Array.from({ length: TICKS }, (_, i) => {
          const a = (i / TICKS) * 2 * Math.PI - Math.PI / 2;
          const [c, s] = [Math.cos(a), Math.sin(a)];
          return <Line key={i} x1={110 + 90 * c} y1={110 + 90 * s} x2={110 + 104 * c} y2={110 + 104 * s} stroke={i < lit ? t.tur : t.hair} strokeWidth={4} strokeLinecap="round" />;
        })}
      </Svg>
      {children}
    </View>
  );
}
