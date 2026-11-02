import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHissaTheme } from '../../../shared/theme/HissaThemeProvider';
import { hissaRadii } from '../../../shared/theme/hissaTokens';
import { HissaText } from '../../../shared/ui/hissa/HissaText';
import { PrimaryButton } from '../../../shared/ui/hissa/PrimaryButton';
import { dishById } from '../../nutrition/catalog';
import { HALF, kcalForItem, kcalForItems, mealName, portionText } from '../../nutrition/engine';
import { todayContent as c } from '../content';
import { fmt, mealTimeLabel } from '../format';
import { updateMealItems, type StoredMeal } from '../mealsStore';

const MAX_QTY = 10;

function Step({ glyph, label, disabled, onPress }: { glyph: string; label: string; disabled: boolean; onPress: () => void }) {
  const t = useHissaTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      onPress={disabled ? undefined : onPress}
      style={{ width: 48, height: 48, borderRadius: hissaRadii.control, borderWidth: 1, borderColor: t.hair, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : 1 }}
    >
      <HissaText variant="label" style={{ fontSize: 22, lineHeight: 28 }}>
        {glyph}
      </HissaText>
    </Pressable>
  );
}

/** Bottom sheet for one meal: a half-step stepper per dish (kcal and the ring follow), and Remove. */
export function MealSheet({ meal, onClose, onRemove }: { meal: StoredMeal | null; onClose: () => void; onRemove: (meal: StoredMeal) => void }) {
  const t = useHissaTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const change = (m: StoredMeal, idx: number, d: number) =>
    updateMealItems(m.id, m.items.map((it, n) => (n === idx ? { ...it, qty: Math.min(MAX_QTY, Math.max(HALF, it.qty + d)) } : it)));

  return (
    <Modal visible={meal !== null} transparent animationType={reduced ? 'none' : 'slide'} onRequestClose={onClose}>
      <Pressable accessible={false} onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.45)', justifyContent: 'flex-end' }}>
        {meal && (
          <Pressable
            accessible={false}
            onPress={() => {}}
            style={{ width: '100%', maxWidth: 480, maxHeight: '85%', alignSelf: 'center', backgroundColor: t.surf, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 24) }}
          >
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.hair, alignSelf: 'center', marginBottom: 14 }} />
            <HissaText variant="title" accessibilityRole="header" style={{ fontSize: 22, lineHeight: 28 }}>
              {mealName(meal.items)}
            </HissaText>
            <HissaText variant="caption">{mealTimeLabel(meal.at)}</HissaText>
            <ScrollView style={{ marginTop: 12, flexGrow: 0 }}>
              {meal.items.map((it, idx) => {
                const dish = dishById(it.dishId);
                if (!dish) return null;
                return (
                  <View key={it.dishId + idx} style={{ minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: t.hair }}>
                    <View style={{ flex: 1 }}>
                      <HissaText variant="label">{dish.name}</HissaText>
                      <HissaText variant="caption">{portionText(it)}</HissaText>
                      <HissaText variant="caption">{c.sheet.dishKcal(fmt(kcalForItem(it)))}</HissaText>
                    </View>
                    <Step glyph="-" label={c.sheet.less(dish.name)} disabled={it.qty <= HALF} onPress={() => change(meal, idx, -HALF)} />
                    <Step glyph="+" label={c.sheet.more(dish.name)} disabled={it.qty >= MAX_QTY} onPress={() => change(meal, idx, HALF)} />
                  </View>
                );
              })}
            </ScrollView>
            <HissaText variant="caption" style={{ marginTop: 12 }}>
              {c.sheet.total(fmt(kcalForItems(meal.items)))}
            </HissaText>
            <View style={{ gap: 8, marginTop: 16 }}>
              <PrimaryButton label={c.sheet.done} onPress={onClose} />
              <PrimaryButton outline label={c.sheet.remove} onPress={() => onRemove(meal)} />
            </View>
          </Pressable>
        )}
      </Pressable>
    </Modal>
  );
}
