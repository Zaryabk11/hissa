import { Children, useState, type ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';

/** CSS `repeat(auto-fit, minmax(min(100%, minCol), 1fr))` for a handful of children. */
export function Grid({ children, minCol, gap, marginTop = 0 }: { children: ReactNode; minCol: number; gap: number; marginTop?: number }) {
  const [w, setW] = useState(0);
  const items = Children.toArray(children);
  const cols = Math.max(1, Math.min(items.length, Math.floor((w + gap) / (minCol + gap))));
  const colW = (w - gap * (cols - 1)) / cols;
  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      style={{ marginTop, flexDirection: 'row', flexWrap: 'wrap', gap }}
    >
      {w > 0 && items.map((c, i) => <View key={i} style={{ width: colW }}>{c}</View>)}
    </View>
  );
}
