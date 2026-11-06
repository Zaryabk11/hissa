import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hissaRadii, MIN_TAP } from '../../shared/theme/hissaTokens';
import { Backdrop } from '../../shared/ui/hissa/Backdrop';
import { Dabbu } from '../../shared/ui/hissa/Dabbu';
import { Panel } from '../../shared/ui/hissa/Panel';
import { SecondaryButton } from '../../shared/ui/hissa/SecondaryButton';
import { SpeechBubble } from '../../shared/ui/hissa/SpeechBubble';
import { sticker } from '../../shared/ui/hissa/sticker';
import { useHissaTheme } from '../../shared/theme/HissaThemeProvider';
import { useColumnLayout } from '../../shared/ui/hissa/HissaScreen';
import { HissaText } from '../../shared/ui/hissa/HissaText';
import { PrimaryButton } from '../../shared/ui/hissa/PrimaryButton';
import { useScan } from '../scan/store';
import { portionText } from '../nutrition/engine';
import { saveMeal } from '../core/api';
import { snapsEnabled } from '../../shared/flags';
import { scanContent } from '../scan/content';
import { afterSave } from '../scan/sendSnap';
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
  const { image, items: reviewed, plan } = useScan();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const rows = (plan?.items ?? []).map((i) => ({ name: i.name, portion: portionText({ dishId: i.slug, qty: i.units }) }));
  const light = plan?.kind !== 'full';
  const spoken = rows.map((r) => `${r.portion} ${r.name}`).join(', ');

  const ate = async () => {
    if (!plan || busy) return;
    setBusy(true);
    setError(null);
    try {
      const meal = await saveMeal(mealPayload(reviewed, plan.items).items);
      afterSave(meal.id);
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
      <Backdrop />
      <View style={{ position: 'absolute', top: insets.top + 56, bottom: 0, left: split ? '50%' : 0, right: 0, alignItems: 'center' }}>
        <Panel style={{ flex: 1, width: '100%', maxWidth: columnMax, padding: 0, paddingTop: 12 }}>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Dabbu mood={light ? 'content' : 'happy'} size={56} />
              <SpeechBubble>{light ? c.lightNote : c.title}</SpeechBubble>
            </View>
            <HissaText variant="title" accessibilityRole="header" style={{ marginTop: 12 }}>
              {light ? c.lightTitle : c.title}
            </HissaText>
            <PlateIllustration
              items={plan.items.map((i) => ({ dishId: i.slug, qty: i.units }))}
              light={light}
              active={sel ?? undefined}
              label={light ? c.lightPlateLabel(spoken) : c.plateLabel(spoken)}
            />
            <View style={{ marginTop: 4, gap: 8 }}>
              {plan.items.map((i, k) => (
                <Pressable
                  key={k}
                  accessibilityRole="button"
                  accessibilityState={{ selected: sel === i.slug }}
                  accessibilityLabel={`${rows[k].name}, ${rows[k].portion}`}
                  onPress={() => setSel(sel === i.slug ? null : i.slug)}
                  style={[sticker(t, 0), { minHeight: MIN_TAP, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingHorizontal: 16, borderRadius: hissaRadii.control, backgroundColor: sel === i.slug ? t.turt : t.surf }]}
                >
                  <HissaText variant="label" style={{ flexShrink: 1 }}>{rows[k].name}</HissaText>
                  <HissaText muted>{rows[k].portion}</HissaText>
                </Pressable>
              ))}
            </View>
            <HissaText variant="caption" style={{ marginTop: 8 }}>
              {rows.length === 0 ? c.empty : c.estimate(fmt(plan.totalCalories))}
            </HissaText>
            {plan.suggestions.length > 0 && <HissaText muted style={{ marginTop: 12 }}>You could add {plan.suggestions.map((i) => i.name).join(' or ')}.</HissaText>}
            {error && <HissaText accessibilityRole="alert" style={{ marginTop: 12 }}>{error}</HissaText>}
          </ScrollView>
          <View style={{ gap: 8, paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 34) }}>
            {snapsEnabled && image && <HissaText variant="caption">{scanContent.review.snapNotice}</HissaText>}
            <PrimaryButton label={busy ? 'Saving…' : c.ate} disabled={rows.length === 0 || busy} onPress={() => void ate()} />
            <SecondaryButton label={c.adjust} onPress={() => router.back()} />
          </View>
        </Panel>
      </View>
    </View>
  );
}
