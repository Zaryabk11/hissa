import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useHissaTheme } from '../../shared/theme/HissaThemeProvider';
import { HissaScreen } from '../../shared/ui/hissa/HissaScreen';
import { sticker } from '../../shared/ui/hissa/sticker';
import { HissaText } from '../../shared/ui/hissa/HissaText';
import { PrimaryButton } from '../../shared/ui/hissa/PrimaryButton';
import { getCatalog } from '../core/api';
import { setCatalog } from '../nutrition/catalog';
import { getHistory } from './api/history';
import { BackHeader } from './components/BackHeader';
import { Skeleton } from './components/Skeleton';
import { historyContent as c } from './content';
import { dayRows, type HistoryDay } from './history-view';

export function HistoryScreen() {
  const router = useRouter();
  const t = useHissaTheme();
  const [days, setDays] = useState<HistoryDay[] | null>(null);
  const [error, setError] = useState(false);
  const [notice, setNotice] = useState(false);
  const [retry, setRetry] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const hasData = useRef(false);

  const load = useCallback(
    (live: () => boolean) =>
      Promise.all([getCatalog(), getHistory()])
        .then(([catalog, history]) => {
          if (!live()) return;
          setCatalog(catalog.dishes);
          hasData.current = true;
          setDays(history.days);
          setNotice(false);
        })
        .catch(() => {
          if (!live()) return;
          // Keep what is on screen when only a refresh fails.
          if (hasData.current) setNotice(true);
          else setError(true);
        }),
    [],
  );

  // Focus reloads quietly, so a meal edited or deleted on the detail screen is fresh on return.
  useFocusEffect(
    useCallback(() => {
      void retry;
      let live = true;
      void load(() => live);
      return () => {
        live = false;
      };
    }, [retry, load]),
  );

  const refresh = () => {
    setRefreshing(true);
    void load(() => true).finally(() => setRefreshing(false));
  };
  const back = () => (router.canGoBack() ? router.back() : router.navigate('/(tabs)/today'));
  const header = (
    <>
      <BackHeader onPress={back} />
      <HissaText variant="title" accessibilityRole="header" style={{ marginTop: 4 }}>
        {c.title}
      </HissaText>
    </>
  );

  if (error)
    return (
      <HissaScreen>
        {header}
        <HissaText accessibilityRole="alert" style={{ marginTop: 16 }}>
          {c.loadError}
        </HissaText>
        <View style={{ marginTop: 16 }}>
          <PrimaryButton
            label={c.retry}
            onPress={() => {
              setError(false);
              setRetry((n) => n + 1);
            }}
          />
        </View>
      </HissaScreen>
    );
  if (!days)
    return (
      <HissaScreen>
        {header}
        <Skeleton label={c.loading} rows={4} />
      </HissaScreen>
    );

  const rows = dayRows(days);
  return (
    <HissaScreen onRefresh={refresh} refreshing={refreshing}>
      {header}
      {notice && (
        <HissaText accessibilityRole="alert" muted style={{ marginTop: 8 }}>
          {c.refreshFailed}
        </HissaText>
      )}
      {rows.length === 0 ? (
        <View style={{ marginTop: 28, padding: 24, borderRadius: 26, borderWidth: 2, borderStyle: 'dashed', borderColor: t.line, backgroundColor: t.surf, alignItems: 'center', gap: 12 }}>
          <HissaText variant="title" accessibilityRole="header">
            {c.empty.title}
          </HissaText>
          <HissaText muted style={{ textAlign: 'center' }}>
            {c.empty.body}
          </HissaText>
          <View style={{ alignSelf: 'stretch' }}>
            <PrimaryButton label={c.empty.cta} onPress={() => router.push('/(tabs)/scan')} />
          </View>
        </View>
      ) : (
        rows.map((d) => (
          <View key={d.day} style={{ marginTop: 28, gap: 10 }}>
            <View accessible accessibilityRole="header" accessibilityLabel={`${d.heading}. ${d.total}`}>
              <HissaText variant="label">{d.heading}</HissaText>
              <HissaText variant="caption">{d.total}</HissaText>
            </View>
            {d.meals.map((m) => (
              <Pressable
                key={m.id}
                accessibilityRole="button"
                accessibilityLabel={c.openMeal(`${m.time}, ${m.names}, ${m.kcal}`)}
                onPress={() => router.push(`/meals/${m.id}`)}
                style={[sticker(t, 3), { minHeight: 44, padding: 16, borderRadius: 26, backgroundColor: t.surf, gap: 4 }]}
              >
                <HissaText variant="label">{m.names}</HissaText>
                <HissaText variant="caption">{m.time}</HissaText>
                <HissaText variant="caption">{m.kcal}</HissaText>
              </Pressable>
            ))}
          </View>
        ))
      )}
    </HissaScreen>
  );
}
