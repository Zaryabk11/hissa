import type { ComponentProps } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useRouter, type Tabs } from 'expo-router';
import { useHissaTheme } from '../../theme/HissaThemeProvider';
import { useUnread } from '../../../features/social/useSocialData';
import { Backdrop } from './Backdrop';
import { sticker } from './sticker';
import { useColumnLayout } from './HissaScreen';
import { HissaText } from './HissaText';

type BarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const SCAN_SIZE = 64;
const PILL = 76; // height of the bar surface; every slot is this tall and centres its icon and label
const RAISE = 52; // how far the Scan button rises above the bar surface
const LABELS = {
  today: 'Today',
  scan: 'Scan a meal',
  feel: 'Food & Feel',
  social: 'Social',
  profile: 'Profile',
} as const;
type TabName = keyof typeof LABELS;
// Two tabs either side of Scan, so the raised button sits at the bar's centre.
const ORDER = ['today', 'feel', 'scan', 'social'] as const;

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
  if (name === 'profile')
    return (
      <Svg {...p}>
        <Circle cx={12} cy={8.5} r={3.5} />
        <Path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
      </Svg>
    );
  if (name === 'social')
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

/** Today | raised Scan | Food & Feel | Social. Plugs into expo-router `Tabs` as `tabBar`, so the screens stay real routes. */
export function TabBar({ state, navigateToTab, insets }: BarProps) {
  const t = useHissaTheme();
  const router = useRouter();
  const { split, columnMax } = useColumnLayout();
  const unread = useUnread(state.index);
  if (state.routes[state.index].name === 'scan') return null; // the camera is full screen
  return (
    <View pointerEvents="box-none" style={{ flexDirection: 'row', marginTop: -RAISE }}>
      {split && <View style={{ flex: 1 }} />}
      <View pointerEvents="box-none" style={{ flex: 1 }}>
      {/* Gingham under the bar, so the strip below it matches the screens. */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: insets.bottom + 8 }}>
        <Backdrop />
      </View>
      <View
        accessibilityRole="tablist"
        pointerEvents="box-none"
        style={{
          paddingTop: RAISE,
          paddingBottom: insets.bottom + 8,
          flexDirection: 'row',
          paddingHorizontal: 8,
          width: '100%',
          maxWidth: columnMax,
          alignSelf: 'center',
        }}
      >
        {/* The bar surface starts RAISE px down, so the raised Scan button still sits inside this view's bounds (touch on Android). */}
        <View
          pointerEvents="none"
          style={[
            sticker(t, 4),
            { position: 'absolute', top: RAISE, left: 8, right: 8, bottom: insets.bottom + 8, borderRadius: 30, backgroundColor: t.surf },
          ]}
        />
        {ORDER.map((name) => {
          const i = state.routes.findIndex((r) => r.name === name);
          const route = state.routes[i];
          if (!route) return null;
          const focused = state.index === i;
          const press = () => navigateToTab(route.key);
          const isScan = name === 'scan';
          const color = focused ? t.tur : t.muted;
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
                      // Five equal slots with Scan in the middle one, so it sits at the bar's centre.
                      flex: 1,
                      height: PILL,
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
                    borderWidth: 2,
                    borderColor: t.line,
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `3px 3px 0 ${t.drop}`,
                  }}
                >
                  <Icon name="scan" color={t.onPri} />
                </View>
              ) : (
                <>
                  <Icon name={name} color={color} />
                  <HissaText variant="caption" numberOfLines={1} style={{ color, fontSize: 11 }}>
                    {LABELS[name]}
                  </HissaText>
                  {name === 'social' && unread > 0 && (
                    <View
                      accessibilityLabel={`${unread} unread`}
                      style={{ position: 'absolute', top: 0, right: '22%', minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: t.pri, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <HissaText variant="caption" style={{ color: t.onPri, fontSize: 11, lineHeight: 14 }}>
                        {unread > 9 ? '9+' : unread}
                      </HissaText>
                    </View>
                  )}
                </>
              )}
            </Pressable>
          );
        })}
        {/* Profile is a screen outside the tabs, so it is pushed rather than switched to. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={LABELS.profile}
          onPress={() => router.push('/profile')}
          style={{ flex: 1, height: PILL, alignItems: 'center', justifyContent: 'center', gap: 2 }}
        >
          <Icon name="profile" color={t.muted} />
          <HissaText variant="caption" numberOfLines={1} style={{ color: t.muted, fontSize: 11 }}>
            {LABELS.profile}
          </HissaText>
        </Pressable>
      </View>
      </View>
    </View>
  );
}
