import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ApiError } from '../../shared/api/client';
import { useHissaTheme } from '../../shared/theme/HissaThemeProvider';
import { hissaRadii } from '../../shared/theme/hissaTokens';
import { HissaScreen } from '../../shared/ui/hissa/HissaScreen';
import { sticker } from '../../shared/ui/hissa/sticker';
import { HissaText } from '../../shared/ui/hissa/HissaText';
import { PrimaryButton } from '../../shared/ui/hissa/PrimaryButton';
import { getCatalog, type ApiMeal } from '../core/api';
import { dishById, setCatalog } from '../nutrition/catalog';
import { kcalForItem, portionText } from '../nutrition/engine';
import { deleteMeal, getMeal, updateMeal } from './api/history';
import { BackHeader } from './components/BackHeader';
import { Skeleton } from './components/Skeleton';
import { historyContent as c } from './content';
import {
  canSave,
  confirmedLines,
  dishName,
  editTotal,
  failureKind,
  kcalLabel,
  mealDateLabel,
  removeLine,
  saveFailureText,
  savePayload,
  stepLine,
  timeLabel,
  type Line,
} from './history-view';

const statusOf = (cause: unknown) => (cause instanceof ApiError ? cause.status : undefined);

function Square({ glyph, label, onPress, disabled }: { glyph: string; label: string; onPress: () => void; disabled?: boolean }) {
  const t = useHissaTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      onPress={disabled ? undefined : onPress}
      style={[sticker(t, 2), { width: 48, height: 48, borderRadius: hissaRadii.control, backgroundColor: t.surf2, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : 1 }]}
    >
      <HissaText variant="label" style={{ fontSize: 22, lineHeight: 28 }}>
        {glyph}
      </HissaText>
    </Pressable>
  );
}

function DishRow({ line, editing, canRemove, onStep, onRemove }: { line: Line; editing: boolean; canRemove: boolean; onStep: (d: 1 | -1) => void; onRemove: () => void }) {
  const t = useHissaTheme();
  const name = dishName(line.dishId);
  return (
    <View style={[sticker(t, 3), { padding: 16, borderRadius: 26, backgroundColor: t.surf, gap: 4 }]}>
      <HissaText variant="label">{name}</HissaText>
      <HissaText muted>{c.detail.portion(portionText(line) || String(line.qty))}</HissaText>
      <HissaText variant="caption">{kcalLabel(kcalForItem(line))}</HissaText>
      {editing && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <Square glyph="−" label={c.detail.decrease(name)} disabled={!dishById(line.dishId)} onPress={() => onStep(-1)} />
          <Square glyph="+" label={c.detail.increase(name)} disabled={!dishById(line.dishId)} onPress={() => onStep(1)} />
          <View style={{ flex: 1 }} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={c.detail.remove(name)}
            accessibilityState={{ disabled: !canRemove }}
            onPress={canRemove ? onRemove : undefined}
            style={{ minHeight: 48, paddingHorizontal: 12, justifyContent: 'center', opacity: canRemove ? 1 : 0.4 }}
          >
            <HissaText variant="button" style={{ color: t.pri }}>
              {c.detail.removeShort}
            </HissaText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export function MealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useHissaTheme();
  const [meal, setMeal] = useState<ApiMeal | null>(null);
  const [load, setLoad] = useState<'loading' | 'gone' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  const [lines, setLines] = useState<Line[] | null>(null); // null = viewing, an array = editing
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  const [message, setMessage] = useState<{ text: string; alert: boolean } | null>(null);

  useEffect(() => {
    void retry;
    let live = true;
    Promise.all([getCatalog(), getMeal(id)])
      .then(([catalog, res]) => {
        if (!live) return;
        setCatalog(catalog.dishes);
        setMeal(res.meal);
      })
      .catch((cause) => {
        if (live) setLoad(failureKind(statusOf(cause)));
      });
    return () => {
      live = false;
    };
  }, [id, retry]);

  const toList = () => (router.canGoBack() ? router.back() : router.navigate('/meals'));
  const back = () => (router.canGoBack() ? router.back() : router.navigate('/(tabs)/today'));

  const save = async () => {
    if (!meal || !lines || busy || !canSave(lines, meal)) return;
    setBusy('save');
    setMessage(null);
    try {
      const res = await updateMeal(meal.id, savePayload(lines, meal).items);
      setMeal(res.meal);
      setLines(null);
      setMessage({ text: c.detail.saved, alert: false });
    } catch (cause) {
      if (statusOf(cause) === 404) {
        setMeal(null);
        setLoad('gone');
      } else setMessage({ text: saveFailureText(statusOf(cause)), alert: true });
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!meal || busy) return;
    setBusy('delete');
    setMessage(null);
    try {
      await deleteMeal(meal.id);
      toList();
    } catch (cause) {
      if (statusOf(cause) === 404) toList();
      else {
        setConfirming(false);
        setMessage({ text: c.del.error, alert: true });
      }
    } finally {
      setBusy(null);
    }
  };

  const header = <BackHeader onPress={back} />;

  if (load === 'gone')
    return (
      <HissaScreen>
        {header}
        <HissaText accessibilityRole="alert" style={{ marginTop: 16 }}>
          {c.detail.gone}
        </HissaText>
        <View style={{ marginTop: 16 }}>
          <PrimaryButton label={c.detail.backToMeals} onPress={toList} />
        </View>
      </HissaScreen>
    );
  if (load === 'error')
    return (
      <HissaScreen>
        {header}
        <HissaText accessibilityRole="alert" style={{ marginTop: 16 }}>
          {c.detail.loadError}
        </HissaText>
        <View style={{ marginTop: 16 }}>
          <PrimaryButton
            label={c.retry}
            onPress={() => {
              setLoad('loading');
              setRetry((n) => n + 1);
            }}
          />
        </View>
      </HissaScreen>
    );
  if (!meal)
    return (
      <HissaScreen>
        {header}
        <Skeleton label={c.detail.loading} rows={3} />
      </HissaScreen>
    );

  const editing = lines !== null;
  const shown = lines ?? confirmedLines(meal);
  const total = lines ? editTotal(lines) : meal.totalCalories;
  const actions = editing ? (
    <View style={{ gap: 8 }}>
      <PrimaryButton label={busy === 'save' ? c.detail.saving : c.detail.save} disabled={!canSave(lines, meal) || !!busy} onPress={() => void save()} />
      <PrimaryButton
        outline
        label={c.detail.cancel}
        disabled={!!busy}
        onPress={() => {
          setLines(null);
          setMessage(null);
        }}
      />
    </View>
  ) : confirming ? undefined : (
    <View style={{ gap: 8 }}>
      {shown.length > 0 && (
        <PrimaryButton
          label={c.detail.edit}
          onPress={() => {
            setLines(confirmedLines(meal));
            setMessage(null);
          }}
        />
      )}
      <PrimaryButton outline label={c.del.start} onPress={() => setConfirming(true)} />
    </View>
  );

  return (
    <HissaScreen actionBar={actions}>
      {header}
      <HissaText variant="caption" style={{ marginTop: 4 }}>
        {mealDateLabel(meal.eatenAt)}
      </HissaText>
      <HissaText variant="title" accessibilityRole="header">
        {timeLabel(meal.eatenAt)}
      </HissaText>
      {editing && (
        <HissaText muted style={{ marginTop: 8 }}>
          {c.detail.editing}
        </HissaText>
      )}
      {message && (
        <HissaText accessibilityRole={message.alert ? 'alert' : undefined} accessibilityLiveRegion="polite" style={{ marginTop: 12 }}>
          {message.text}
        </HissaText>
      )}
      <View style={{ marginTop: 20, gap: 10 }}>
        {shown.map((line, i) => (
          <DishRow
            key={`${line.dishId}-${i}`}
            line={line}
            editing={editing}
            canRemove={shown.length > 1}
            onStep={(d) => setLines((l) => l && stepLine(l, i, d))}
            onRemove={() => setLines((l) => l && removeLine(l, i))}
          />
        ))}
        {editing && shown.length === 1 && <HissaText variant="caption">{c.detail.keepOne}</HissaText>}
      </View>
      <View accessible accessibilityLabel={`${c.detail.total}: ${kcalLabel(total)}`} style={[sticker(t, 3), { marginTop: 20, padding: 16, borderRadius: 26, backgroundColor: t.tint, gap: 2 }]}>
        <HissaText variant="label" style={{ color: t.tintInk }}>
          {c.detail.total}
        </HissaText>
        <HissaText variant="caption" style={{ color: t.tintInk }}>
          {kcalLabel(total)}
        </HissaText>
      </View>
      {confirming && !editing && (
        <View accessibilityRole="alert" style={[sticker(t, 3), { marginTop: 24, padding: 16, borderRadius: 26, backgroundColor: t.surf, gap: 12 }]}>
          <HissaText>{c.del.ask}</HissaText>
          <PrimaryButton label={c.del.no} disabled={!!busy} onPress={() => setConfirming(false)} />
          <PrimaryButton outline label={busy === 'delete' ? c.del.deleting : c.del.yes} disabled={!!busy} onPress={() => void remove()} />
        </View>
      )}
    </HissaScreen>
  );
}
