import type { ReactNode } from 'react';
import { ScrollView, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useHissaTheme } from '../../theme/HissaThemeProvider';

const COLUMN: ViewStyle = { width: '100%', maxWidth: 480, alignSelf: 'center' };

/**
 * Screen frame: themed background with the header arc, safe area, a scrolling body and a bottom action bar.
 * The column is capped at 480 so it reads like a phone on wide web windows.
 */
export function HissaScreen({ children, actionBar }: { children: ReactNode; actionBar?: ReactNode }) {
  const t = useHissaTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View pointerEvents="none" style={[COLUMN, { position: 'absolute', top: 0, height: 233 }]}>
        <Svg width="100%" height="100%" viewBox="0 0 390 233" preserveAspectRatio="none" fill="none" stroke={t.arc}>
          <Path d="M.5 0V222A390 222 0 0 0 390 0" />
          <Path d="M0 232.5H390" />
        </Svg>
      </View>
      <ScrollView
        style={COLUMN}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {actionBar && (
        <View style={[COLUMN, { paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 34) }]}>
          {actionBar}
        </View>
      )}
    </View>
  );
}
