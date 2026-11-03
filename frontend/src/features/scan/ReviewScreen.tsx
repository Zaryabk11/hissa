import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useHissaTheme } from '../../shared/theme/HissaThemeProvider';
import { hissaRadii } from '../../shared/theme/hissaTokens';
import { Bone } from '../../shared/ui/hissa/Bone';
import { HissaScreen } from '../../shared/ui/hissa/HissaScreen';
import { HissaText } from '../../shared/ui/hissa/HissaText';
import { PrimaryButton } from '../../shared/ui/hissa/PrimaryButton';
import { dishById, CATALOG } from '../nutrition/catalog';
import { kcalForItems, portionText } from '../nutrition/engine';
import { getPlan, saveMeal } from '../core/api';
import { CloseButton } from './CloseButton';
import { scanContent as c } from './content';
import { mealPayload, stepQty } from './scanPayload';
import { newItem, patchItem, setItems, setPlan, useScan, type ReviewItem } from './store';

const fmt = (n: number) => n.toLocaleString('en-US');
const nameOf = (id: string) => dishById(id)?.name ?? id;

function Icon({ d, color, size = 20, width = 1.75, children }: { d?: string; color: string; size?: number; width?: number; children?: React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      {d && <Path d={d} />}
      {children}
    </Svg>
  );
}

function Pick({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useHissaTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{ height: 48, minWidth: 96, paddingHorizontal: 16, borderRadius: hissaRadii.control, borderWidth: 1, borderColor: t.hair, alignItems: 'center', justifyContent: 'center' }}
    >
      <HissaText variant="button">{label}</HissaText>
    </Pressable>
  );
}

function TextAction({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useHissaTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
      <HissaText variant="button" style={{ color: t.pri }}>
        {label}
      </HissaText>
    </Pressable>
  );
}

/** The indented card under a chip: answer a question, or swap the dish for another. */
function OptionsCard({ title, options, onPick, action, actionFirst }: { title: string; options: string[]; onPick: (dishId: string) => void; action: { label: string; onPress: () => void }; actionFirst?: boolean }) {
  const t = useHissaTheme();
  const [query, setQuery] = useState('');
  const visible = options.filter((id) => nameOf(id).toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <View accessibilityRole="radiogroup" style={{ marginLeft: 14, borderRadius: hissaRadii.control, backgroundColor: t.surf, borderWidth: 1, borderColor: t.hair, padding: 16 }}>
      <HissaText variant="label">{title}</HissaText>
      {actionFirst && <TextAction label={action.label} onPress={action.onPress} />}
      {options.length > 8 && <TextInput accessibilityLabel="Search dishes" placeholder="Search dishes" placeholderTextColor={t.muted} value={query} onChangeText={setQuery} style={{ color: t.ink, borderWidth: 1, borderColor: t.hair, borderRadius: hissaRadii.control, minHeight: 48, paddingHorizontal: 12, marginTop: 12 }} />}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        {visible.map((o) => (
          <Pick key={o} label={nameOf(o)} onPress={() => onPick(o)} />
        ))}
      </View>
      {!actionFirst && <TextAction label={action.label} onPress={action.onPress} />}
    </View>
  );
}

function Chip({ item, onToggle, onSwap }: { item: ReviewItem; onToggle: () => void; onSwap: () => void }) {
  const t = useHissaTheme();
  const asking = !!item.ask;
  const on = item.confirmed && !asking;
  const ink = asking ? t.tintInk : t.ink;
  return (
    <View
      style={{
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: hissaRadii.control,
        backgroundColor: asking || on ? t.tint : t.surf,
        borderWidth: asking ? 1.5 : 1,
        borderStyle: asking ? 'dashed' : 'solid',
        borderColor: asking ? t.tintInk : on ? t.tintInk : t.hair,
      }}
    >
      <Pressable
        accessibilityRole={asking ? 'button' : 'checkbox'}
        accessibilityState={asking ? undefined : { checked: on }}
        accessibilityLabel={asking ? c.review.question(nameOf(item.dishId)) : `${nameOf(item.dishId)}, ${portionText(item)}`}
        onPress={onToggle}
        style={{ flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 14 }}
      >
        {asking ? (
          <Icon color={ink} d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.5M12 17h.01">
            <Circle cx={12} cy={12} r={9} />
          </Icon>
        ) : on ? (
          <Icon d="M5 12l4 4 10-10" color={t.tintInk} width={2.25} />
        ) : (
          <View style={{ width: 20 }} />
        )}
        <HissaText variant="label" style={{ color: ink }}>
          {asking ? `${nameOf(item.dishId)}?` : nameOf(item.dishId)}
        </HissaText>
        <HissaText variant="caption" style={{ flex: 1, color: asking ? t.tintInk : t.muted }}>
          {portionText(item)}
        </HissaText>
      </Pressable>
      {!asking && (
        <Pressable accessibilityRole="button" accessibilityLabel={c.review.swap(nameOf(item.dishId))} onPress={onSwap} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
          <Icon d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" color={t.muted} />
        </Pressable>
      )}
    </View>
  );
}

/** Keep removed predictions so the saved meal records what the scan got wrong. */
function RemovedRow({ item }: { item: ReviewItem }) {
  const t = useHissaTheme();
  return (
    <View style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingLeft: 14, borderRadius: hissaRadii.control, backgroundColor: t.surf, borderWidth: 1, borderColor: t.hair, opacity: 0.6 }}>
      <HissaText variant="label" style={{ flex: 1, textDecorationLine: 'line-through' }}>
        {nameOf(item.dishId)}
      </HissaText>
      <Pressable accessibilityRole="button" accessibilityLabel={c.review.undoLabel(nameOf(item.dishId))} onPress={() => patchItem(item.id, { removed: false })} style={{ minHeight: 48, paddingHorizontal: 14, justifyContent: 'center' }}>
        <HissaText variant="button" style={{ color: t.pri }}>
          Undo
        </HissaText>
      </Pressable>
    </View>
  );
}

/** Stands in for the dish list while the server builds the plan. */
function PlanSkeleton({ rows }: { rows: number }) {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={c.review.planning} accessibilityState={{ busy: true }} style={{ marginTop: 24, gap: 8 }}>
      {Array.from({ length: Math.min(Math.max(rows, 1), 4) }, (_, k) => (
        <Bone key={k} width="100%" height={48} radius={hissaRadii.control} border />
      ))}
    </View>
  );
}

type Open = { id: string; mode: 'ask' | 'swap' } | 'add' | null;

/** Screen i. Detected dishes as chips: confirm, swap, answer the question, remove with undo, add a dish. */
export function ReviewScreen() {
  const router = useRouter();
  const t = useHissaTheme();
  const { photoUri, items, manualReason } = useScan();
  useEffect(() => { if (!photoUri) router.replace('/(tabs)/scan'); }, [photoUri, router]);
  const [open, setOpen] = useState<Open>(null);
  const [busy, setBusy] = useState<'save' | 'plan' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const active = items.filter((i) => !i.removed);
  const canContinue = active.length > 0 && active.every((i) => i.confirmed && !i.ask && !!dishById(i.dishId));
  const total = kcalForItems(active);

  const swapTo = (id: string, dishId: string) => {
    const dish = dishById(dishId);
    if (dish) patchItem(id, { dishId, qty: dish.defaultQty, ask: undefined, confirmed: true });
    setOpen(null);
  };
  const toggle = (i: ReviewItem) => (i.ask ? setOpen(open && open !== 'add' && open.id === i.id ? null : { id: i.id, mode: 'ask' }) : patchItem(i.id, { confirmed: !i.confirmed }));
  const save = async () => {
    if (busy || !canContinue) return;
    setBusy('save');
    setError(null);
    try {
      await saveMeal(mealPayload(items).items);
      router.navigate('/(tabs)/today');
    } catch {
      setError('Could not confirm the save. Check Today before trying again.');
    } finally {
      setBusy(null);
    }
  };
  const showPlan = async () => {
    if (busy || !canContinue) return;
    setBusy('plan');
    setError(null);
    try {
      const plan = await getPlan(active.map((i) => ({ slug: i.dishId, units: i.qty })));
      setPlan(plan);
      router.push('/plan');
    } catch {
      setError('Could not build your plan. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <HissaScreen actionBar={
        <View style={{ gap: 8 }}>
          <PrimaryButton label={busy === 'plan' ? 'Working…' : c.review.cta} disabled={!canContinue || !!busy} onPress={() => void showPlan()} />
          <PrimaryButton outline label={busy === 'save' ? 'Saving…' : c.review.save} disabled={!canContinue || !!busy} onPress={() => void save()} />
        </View>
      }>
      <View style={{ alignItems: 'flex-end' }}>
        <CloseButton onPress={() => router.navigate('/(tabs)/today')} />
      </View>
      {manualReason && <HissaText muted style={{ marginTop: 16 }}>Photo scans are unavailable right now. Add the dishes on your plate by hand.</HissaText>}
      {error && <HissaText accessibilityRole="alert" style={{ marginTop: 12 }}>{error}</HissaText>}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 }}>
        {photoUri && <Image accessibilityLabel={c.review.photo} source={{ uri: photoUri }} style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: t.rim }} />}
        <View style={{ flex: 1 }}>
          <HissaText variant="title" accessibilityRole="header">
            {c.review.title}
          </HissaText>
          <HissaText variant="caption">{c.review.sub}</HissaText>
        </View>
      </View>

      {busy === 'plan' ? (
        <PlanSkeleton rows={active.length} />
      ) : (
      <View style={{ marginTop: 24, gap: 8 }}>
        {items.map((i) => {
          const here = open && open !== 'add' && open.id === i.id ? open.mode : null;
          return (
            <View key={i.id} style={{ gap: 8 }}>
              {i.removed ? (
                <RemovedRow item={i} />
              ) : (
                <Chip item={i} onToggle={() => toggle(i)} onSwap={() => setOpen(here === 'swap' ? null : { id: i.id, mode: 'swap' })} />
              )}
              {!i.removed && !i.ask && !!dishById(i.dishId) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 14 }}>
                  <HissaText variant="caption" style={{ flex: 1 }}>Portion estimate: {portionText(i)}</HissaText>
                  <Pick label="−" onPress={() => patchItem(i.id, { qty: stepQty(i.qty, dishById(i.dishId)!.unit, -1), confirmed: true })} />
                  <Pick label="+" onPress={() => patchItem(i.id, { qty: stepQty(i.qty, dishById(i.dishId)!.unit, 1), confirmed: true })} />
                </View>
              )}
              {here === 'ask' && i.ask && (
                <OptionsCard title={i.dishId === 'unknown' ? 'Choose a dish from the catalog' : c.review.askTitle(i.ask.map(nameOf))} options={i.dishId === 'unknown' ? CATALOG.map((d) => d.id) : i.ask} onPick={(n) => swapTo(i.id, n)} action={{ label: i.dishId === 'unknown' ? c.review.remove : c.review.somethingElse, onPress: () => { if (i.dishId === 'unknown') { patchItem(i.id, { removed: true }); setOpen(null); } else setOpen({ id: i.id, mode: 'swap' }); } }} />
              )}
              {here === 'swap' && (
                <OptionsCard
                  actionFirst
                  title={c.review.swapTitle(nameOf(i.dishId))}
                  options={CATALOG.map((d) => d.id).filter((id) => id !== i.dishId)}
                  onPick={(n) => swapTo(i.id, n)}
                  action={{ label: c.review.remove, onPress: () => { patchItem(i.id, { removed: true }); setOpen(null); } }}
                />
              )}
            </View>
          );
        })}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={c.review.addDish}
          accessibilityState={{ expanded: open === 'add', disabled: items.length >= 10 }}
          disabled={items.length >= 10}
          onPress={() => setOpen(open === 'add' ? null : 'add')}
          style={{ height: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 }}
        >
          <Icon d="M12 5v14M5 12h14" color={t.pri} />
          <HissaText variant="button" style={{ color: t.pri }}>
            {c.review.addDish}
          </HissaText>
        </Pressable>
        {open === 'add' && (
          <OptionsCard
            title={c.review.addTitle}
            options={CATALOG.map((d) => d.id)}
            onPick={(id) => {
              const dish = dishById(id)!;
              setItems([...items, { ...newItem({ dishId: id, qty: dish.defaultQty }), confirmed: true }]);
              setOpen(null);
            }}
            action={{ label: c.close, onPress: () => setOpen(null) }}
          />
        )}
      </View>
      )}

      <HissaText variant="caption" style={{ marginTop: 16 }}>
        {active.length === 0 ? c.review.empty : !canContinue ? 'Confirm each dish to see an estimate.' : c.review.estimate(fmt(total))}
      </HissaText>
    </HissaScreen>
  );
}
