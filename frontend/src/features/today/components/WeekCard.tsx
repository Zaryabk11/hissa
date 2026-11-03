import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useHissaTheme } from '../../../shared/theme/HissaThemeProvider';
import { Bone } from '../../../shared/ui/hissa/Bone';
import { HissaText } from '../../../shared/ui/hissa/HissaText';
import { getWeek, type WeekDay } from '../api/week';
import { todayContent as c } from '../content';
import { weekView } from '../week-view';

const CHART_HEIGHT = 96;
const LABEL_ROW = 24;

/** "Your week so far" (design f). Loads on its own, so a failure here never touches the rest of Today. */
export function WeekCard({ budget, refreshKey }: { budget: number; refreshKey: number }) {
  const t = useHissaTheme();
  const router = useRouter();
  const [days, setDays] = useState<WeekDay[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);

  // Refetch on focus (a meal may have been saved or deleted), on pull-to-refresh and on retry.
  // A failed refetch keeps the bars already on screen.
  useFocusEffect(
    useCallback(() => {
      void refreshKey;
      void retry;
      let live = true;
      getWeek()
        .then((w) => {
          if (!live) return;
          setDays(w.days);
          setFailed(false);
        })
        .catch(() => live && setFailed(true));
      return () => {
        live = false;
      };
    }, [refreshKey, retry]),
  );

  const view = days ? weekView(days, budget) : null;
  // Over budget is a soft tint with a lime edge, never red.
  const barColor = (state: string, isToday: boolean) =>
    state === 'empty' ? t.hair : state === 'over' ? t.tint : isToday ? t.tur : t.rim;

  return (
    <View
      style={{
        padding: 16,
        borderRadius: 18,
        backgroundColor: t.surf,
        borderWidth: 1,
        borderColor: t.hair,
        gap: 12,
      }}
    >
      <HissaText variant="label" accessibilityRole="header">
        {c.week.title}
      </HissaText>
      {!view && !failed && (
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={c.week.loading}
          accessibilityState={{ busy: true }}
          style={{ gap: 8 }}
        >
          <Bone width="100%" height={CHART_HEIGHT} radius={10} />
          <Bone width="70%" height={14} radius={6} />
        </View>
      )}
      {!view && failed && (
        <View style={{ gap: 4 }}>
          <HissaText muted>{c.week.loadError}</HissaText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={c.week.retry}
            onPress={() => {
              setFailed(false);
              setRetry((n) => n + 1);
            }}
            style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}
          >
            <HissaText variant="button" style={{ color: t.tintInk }}>
              {c.week.retry}
            </HissaText>
          </Pressable>
        </View>
      )}
      {view?.empty && <HissaText muted>{c.week.empty}</HissaText>}
      {view && !view.empty && (
        <>
          <View style={{ height: CHART_HEIGHT + LABEL_ROW }}>
            <View
              importantForAccessibility="no-hide-descendants"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: LABEL_ROW + view.budgetFraction * CHART_HEIGHT,
                height: 1,
                backgroundColor: t.rim,
                opacity: 0.5,
              }}
            />
            <View style={{ flexDirection: 'row', gap: 8, flex: 1 }}>
              {view.bars.map((b) => (
                <View
                  key={b.day}
                  accessible
                  accessibilityRole="image"
                  accessibilityLabel={b.a11y}
                  style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}
                >
                  <View
                    style={{
                      width: '100%',
                      height: Math.max(4, b.fraction * CHART_HEIGHT),
                      borderRadius: 6,
                      backgroundColor: barColor(b.state, b.isToday),
                      borderWidth: b.state === 'over' ? 1 : 0,
                      borderColor: t.tur,
                    }}
                  />
                  <View style={{ height: LABEL_ROW, justifyContent: 'center' }}>
                    <HissaText variant="caption" muted={!b.isToday}>
                      {b.label}
                    </HissaText>
                  </View>
                </View>
              ))}
            </View>
          </View>
          <HissaText variant="caption">{view.summary}</HissaText>
        </>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={c.week.seeAll}
        onPress={() => router.push('/meals')}
        style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}
      >
        <HissaText variant="button" style={{ color: t.tintInk }}>
          {c.week.seeAll}
        </HissaText>
      </Pressable>
    </View>
  );
}
