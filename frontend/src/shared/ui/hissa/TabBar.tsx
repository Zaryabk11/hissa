import type { ComponentProps } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { Tabs } from 'expo-router';
import { useHissaTheme } from '../../theme/HissaThemeProvider';
import { MIN_TAP } from '../../theme/hissaTokens';
import { HissaText } from './HissaText';

type BarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const SCAN_SIZE = 64;
const RAISE = 52; // how far the Scan button rises above the bar surface
const LABELS = {
  today: 'Today',
  scan: 'Scan a meal',
  feel: 'Food & Feel',
  buddy: 'Buddy',
} as const;
type TabName = keyof typeof LABELS;

function Icon({ name, color }: { name: TabName; color: string }) {
  const p = {
    width: name === 'scan' ? 28 : 24,
    height: name === 'scan' ? 28 : 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 1.75,
    strokeLinejoin: 'round',
    strokeLinecap: 'round',
  } as const;
  if (name === 'today')
    return (
      <Svg {...p}>
        <Path d="M3 11l9-8 9 8v10H3z" />
      </Svg>
    );
  if (name === 'feel')
    return (
      <Svg {...p}>
        <Circle cx={12} cy={12} r={9} />
        <Path d="M8 14c1 1.5 2.3 2.2 4 2.2s3-.7 4-2.2M9 9.5h.01M15 9.5h.01" />
      </Svg>
    );
  if (name === 'buddy')
    return (
      <Svg {...p}>
        <Circle cx={9} cy={8} r={3.5} />
        <Circle cx={17} cy={9} r={2.5} />
        <Path d="M3 20c0-3.5 3-5.5 6-5.5s6 2 6 5.5M17 14.5c2.5 0 4 1.5 4 4" />
      </Svg>
    );
  return (
    <Svg {...p}>
      <Path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <Circle cx={12} cy={13} r={3.5} />
    </Svg>
  );
}

/** Today | raised Scan | Food & Feel | Buddy. Plugs into expo-router `Tabs` as `tabBar`, so the screens stay real routes. */
export function TabBar({ state, navigateToTab, insets }: BarProps) {
  const t = useHissaTheme();
  if (state.routes[state.index].name === 'scan') return null; // the camera is full screen
  return (
    <View style={{ backgroundColor: t.bg }}>
      <View
        accessibilityRole="tablist"
        style={{
          paddingTop: RAISE,
          paddingBottom: insets.bottom,
          flexDirection: 'row',
          width: '100%',
          maxWidth: 480,
          alignSelf: 'center',
        }}
      >
        {/* The bar surface starts RAISE px down, so the raised Scan button still sits inside this view's bounds (touch on Android). */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: RAISE,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: t.surf,
            borderTopWidth: 1,
            borderTopColor: t.hair,
          }}
        />
        {state.routes.map((route, i) => {
          const name = route.name as TabName;
          const focused = state.index === i;
          const press = () => navigateToTab(route.key);
          const isScan = name === 'scan';
          const color = focused ? t.pri : t.muted;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={LABELS[name]}
              accessibilityState={{ selected: focused }}
              onPress={press}
              style={
                isScan
                  ? { flex: 1, height: SCAN_SIZE + 8 + 20, marginTop: -RAISE, alignItems: 'center' }
                  : {
                      flex: 1,
                      minHeight: MIN_TAP + 18,
                      marginTop: 22,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 2,
                    }
              }
            >
              {isScan ? (
                <View
                  style={{
                    width: SCAN_SIZE + 8,
                    height: SCAN_SIZE + 8,
                    borderRadius: 99,
                    backgroundColor: t.pri,
                    borderWidth: 4,
                    borderColor: t.bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 24px rgba(0,0,0,.18)',
                  }}
                >
                  <Icon name="scan" color={t.onPri} />
                </View>
              ) : (
                <>
                  <Icon name={name} color={color} />
                  <HissaText variant="caption" style={{ color }}>
                    {LABELS[name]}
                  </HissaText>
                </>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
