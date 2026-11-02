import { View } from 'react-native';
import { useHissaTheme } from '../../theme/HissaThemeProvider';

export function ProgressDots({ step, total }: { step: number; total: number }) {
  const t = useHissaTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${step} of ${total}`}
      accessibilityValue={{ min: 1, max: total, now: step }}
      style={{ flex: 1, flexDirection: 'row', gap: 8 }}
    >
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < step ? t.pri : t.hair }} />
      ))}
    </View>
  );
}
