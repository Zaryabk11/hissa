import { View } from 'react-native';
import { Bone } from '../../../shared/ui/hissa/Bone';

/** Placeholder rows while a screen loads. */
export function Skeleton({ label, rows }: { label: string; rows: number }) {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityState={{ busy: true }} style={{ marginTop: 20, gap: 10 }}>
      <Bone width={160} height={20} radius={8} />
      {Array.from({ length: rows }, (_, k) => (
        <Bone key={k} width="100%" height={72} radius={18} border />
      ))}
    </View>
  );
}
