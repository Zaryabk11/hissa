import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useHissaTheme } from '../../../shared/theme/HissaThemeProvider';
import { HissaText } from '../../../shared/ui/hissa/HissaText';
import { buddyContent as c } from '../content';

/** A Hissa card: surface fill, hairline border, radius 18. `tint` is the soft lime wash. */
export function Card({ children, tint }: { children: ReactNode; tint?: boolean }) {
  const t = useHissaTheme();
  return (
    <View
      style={{
        padding: 16,
        gap: 12,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: t.hair,
        backgroundColor: tint ? t.tint : t.surf,
      }}
    >
      {children}
    </View>
  );
}

/** One person's logged-today row: a filled lime dot when logged, a dashed ring when not. */
export function LoggedRow({ who, logged }: { who: string; logged: boolean }) {
  const t = useHissaTheme();
  const status = logged ? c.paired.logged : c.paired.notYet;
  return (
    <View
      accessible
      accessibilityLabel={`${who}. ${status}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}
    >
      <View style={{ flex: 1 }}>
        <HissaText variant="label">{who}</HissaText>
        <HissaText variant="caption">{status}</HissaText>
      </View>
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: logged ? t.pri : 'transparent',
          borderWidth: logged ? 0 : 1.5,
          borderStyle: 'dashed',
          borderColor: t.rim,
        }}
      />
    </View>
  );
}

function Bone({ height, width = '100%' }: { height: number; width?: number | `${number}%` }) {
  const t = useHissaTheme();
  return <View style={{ height, width, borderRadius: 10, backgroundColor: t.hair }} />;
}

/** Placeholder card while the first status loads. Static, so it needs no motion handling. */
export function BuddySkeleton() {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={c.loading}
      accessibilityState={{ busy: true }}
    >
      <Card>
        <Bone height={24} width="60%" />
        <Bone height={16} />
        <Bone height={16} width="80%" />
        <Bone height={52} />
      </Card>
    </View>
  );
}
