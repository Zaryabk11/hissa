import { useRouter } from 'expo-router';
import { Image, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHissaTheme } from '../../shared/theme/HissaThemeProvider';
import { HissaText } from '../../shared/ui/hissa/HissaText';
import { PrimaryButton } from '../../shared/ui/hissa/PrimaryButton';
import { useScan } from '../scan/store';
import { placeholderDailyKcal } from '../onboarding/placeholderDailyKcal';
import { useAnswers } from '../onboarding/store';
import { dishById } from '../nutrition/catalog';
import { kcalForItems, planForRemaining, portionText, remainingBudget } from '../nutrition/engine';
import { dateKey } from '../nutrition/week';
import { fmt } from '../today/format';
import { addMeal, mealsOn, useMealsByDate } from '../today/mealsStore';
import { planContent as c } from './content';
import { PlateIllustration } from './PlateIllustration';

/**
 * Plan sheet (j) and Light plan (k). The plate comes from planForRemaining: what the user confirmed if it fits in
 * what is left today, otherwise a lighter version of the same food. Never red, never scolding.
 */
export function PlanScreen() {
  const router = useRouter();
  const t = useHissaTheme();
  const insets = useSafeAreaInsets();
  const { photoUri, items: reviewed } = useScan();
  const answers = useAnswers();
  const byDate = useMealsByDate();

  const wanted = reviewed.filter((i) => !i.removed).map(({ dishId, qty }) => ({ dishId, qty }));
  const eaten = kcalForItems(mealsOn(byDate, dateKey(new Date())).flatMap((m) => m.items));
  const plan = planForRemaining(remainingBudget(placeholderDailyKcal(answers), eaten), wanted);
  const rows = plan.items.map((i) => ({
    name: dishById(i.dishId)?.name ?? '',
    portion: portionText(i),
  }));
  const spoken = rows.map((r) => `${r.portion} ${r.name}`).join(', ');

  const ate = () => {
    addMeal(plan.items);
    router.navigate('/(tabs)/today');
  };

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
          left: 0,
          right: 0,
          alignItems: 'center',
        }}
      >
        <View
          style={{
            flex: 1,
            width: '100%',
            maxWidth: 480,
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
              {plan.light ? c.lightTitle : c.title}
            </HissaText>
            {plan.light && (
              <HissaText muted style={{ marginTop: 8 }}>
                {c.lightNote}
              </HissaText>
            )}
            <PlateIllustration
              items={plan.items}
              light={plan.light}
              label={plan.light ? c.lightPlateLabel(spoken) : c.plateLabel(spoken)}
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
              {rows.length === 0 ? c.empty : c.estimate(fmt(plan.kcal))}
            </HissaText>
          </ScrollView>
          <View
            style={{
              gap: 8,
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: Math.max(insets.bottom, 34),
            }}
          >
            <PrimaryButton label={c.ate} disabled={rows.length === 0} onPress={ate} />
            <PrimaryButton outline label={c.adjust} onPress={() => router.back()} />
          </View>
        </View>
      </View>
    </View>
  );
}
