import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { content } from '../../../features/landing/content';
import { useHissaTheme } from '../../theme/HissaThemeProvider';
import { hissaFonts } from '../../theme/hissaTokens';
import { HissaText } from './HissaText';

const WIDE = 900; // from here the column is wider than a phone
const SPLIT = 1100; // from here a brand pane fills the left half

/** Content column width and brand-pane flag for the current window; shared so the tab bar and sheets line up with HissaScreen. */
export function useColumnLayout() {
  const { width } = useWindowDimensions();
  return { width, split: width >= SPLIT, columnMax: width >= WIDE ? 560 : 480 };
}

/**
 * Screen frame: themed background with the header arc, safe area, a scrolling body and a bottom action bar.
 * The column is 480 on phones, 560 from WIDE, and from SPLIT a brand pane takes the left half.
 */
export function HissaScreen({ children, actionBar, onRefresh, refreshing = false }: { children: ReactNode; actionBar?: ReactNode; onRefresh?: () => void; refreshing?: boolean }) {
  const t = useHissaTheme();
  const insets = useSafeAreaInsets();
  const { width, split, columnMax } = useColumnLayout();
  const COLUMN: ViewStyle = { width: '100%', maxWidth: columnMax, alignSelf: 'center' };
  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: t.bg }}>
      {split && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48, borderRightWidth: 1, borderRightColor: t.hair }}>
          <HissaText accessibilityElementsHidden style={{ fontFamily: hissaFonts.display700, fontSize: Math.min(200, width * 0.14), lineHeight: Math.min(200, width * 0.14), letterSpacing: -6, color: t.pri }}>
            {content.footer.wordmark}
          </HissaText>
          <HissaText variant="body" muted style={{ marginTop: 16 }}>
            {content.footer.tagline}
          </HissaText>
        </View>
      )}
      <View style={{ flex: 1 }}>
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
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.pri} /> : undefined}
      >
        {children}
      </ScrollView>
      {actionBar && (
        <View style={[COLUMN, { paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 34) }]}>
          {actionBar}
        </View>
      )}
      </View>
    </View>
  );
}
