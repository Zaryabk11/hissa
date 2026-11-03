import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHissaTheme } from '../../shared/theme/HissaThemeProvider';
import { useColumnLayout } from '../../shared/ui/hissa/HissaScreen';
import { HissaText } from '../../shared/ui/hissa/HissaText';
import { PrimaryButton } from '../../shared/ui/hissa/PrimaryButton';
import { useScan } from '../scan/store';
import { portionText } from '../nutrition/engine';
import { saveMeal } from '../core/api';
import { mealPayload } from '../scan/scanPayload';
import { fmt } from '../today/format';
import { planContent as c } from './content';
import { PlateIllustration } from './PlateIllustration';

/**
 * Plan sheet (j) and Light plan (k), using the server's portion recommendation.
 */
export function PlanScreen() {
  const router = useRouter();
  const t = useHissaTheme();
  const insets = useSafeAreaInsets();
  const { split, columnMax } = useColumnLayout();
  const { photoUri, items: reviewed, plan } = useScan();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rows = (plan?.items ?? []).map((i) => ({ name: i.name, portion: portionText({ dishId: i.slug, qty: i.units }) }));
  const spoken = rows.map((r) => `${r.portion} ${r.name}`).join(', ');

  const ate = async () => {
    if (!plan || busy) return;
    setBusy(true);
    setError(null);
    try {
      await saveMeal(mealPayload(reviewed, plan.items).items);
      router.navigate('/(tabs)/today');
    } catch {
      setError('Could not confirm the save. Check Today before trying again.');
    } finally {
      setBusy(false);
    }
  };

  if (!plan) return <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: t.bg }}><HissaText>Start with a plate photo to see your plan.</HissaText><PrimaryButton label="Back to scan" onPress={() => router.replace('/(tabs)/scan')} /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {photoUri && (
        <Image
          accessibilityElementsHidden
          importantForAccessibility="no"
          source={{ uri: photoUri }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.35 }}
        />
      )}
      <View
        style={{
          position: 'absolute',
          top: insets.top + 56,
          bottom: 0,
          left: split ? '50%' : 0,
          right: 0,
          alignItems: 'center',
        }}
      >
        <View
          style={{
            flex: 1,
            width: '100%',
            maxWidth: columnMax,
            backgroundColor: t.surf,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 12,
          }}
        >
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: t.hair,
              alignSelf: 'center',
              marginBottom: 14,
            }}
          />
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}>
            <HissaText variant="title" accessibilityRole="header">
              {plan.kind === 'light' || plan.kind === 'minimum' ? c.lightTitle : c.title}
            </HissaText>
            {plan.kind !== 'full' && (
              <HissaText muted style={{ marginTop: 8 }}>
                {c.lightNote}
              </HissaText>
            )}
            <PlateIllustration
              items={plan.items.map((i) => ({ dishId: i.slug, qty: i.units }))}
              light={plan.kind !== 'full'}
              label={plan.kind !== 'full' ? c.lightPlateLabel(spoken) : c.plateLabel(spoken)}
            />
            <View style={{ marginTop: 4 }}>
              {rows.map((r, k) => (
                <View
                  key={k}
                  style={{
                    minHeight: 40,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: t.hair,
                  }}
                >
                  <HissaText variant="label">{r.name}</HissaText>
                  <HissaText muted>{r.portion}</HissaText>
                </View>
              ))}
            </View>
            <HissaText variant="caption" style={{ marginTop: 8 }}>
              {rows.length === 0 ? c.empty : c.estimate(fmt(plan.totalCalories))}
            </HissaText>
            {plan.suggestions.length > 0 && <HissaText muted style={{ marginTop: 12 }}>You could add {plan.suggestions.map((i) => i.name).join(' or ')}.</HissaText>}
            {error && <HissaText accessibilityRole="alert" style={{ marginTop: 12 }}>{error}</HissaText>}
          </ScrollView>
          <View
            style={{
              gap: 8,
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: Math.max(insets.bottom, 34),
            }}
          >
            <PrimaryButton label={busy ? 'Saving…' : c.ate} disabled={rows.length === 0 || busy} onPress={() => void ate()} />
            <PrimaryButton outline label={c.adjust} onPress={() => router.back()} />
          </View>
        </View>
      </View>
    </View>
  );
}
