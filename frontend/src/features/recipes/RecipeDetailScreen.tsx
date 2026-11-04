import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { ApiError } from '../../shared/api/client';
import { HissaScreen } from '../../shared/ui/hissa/HissaScreen';
import { HissaText } from '../../shared/ui/hissa/HissaText';
import { PrimaryButton } from '../../shared/ui/hissa/PrimaryButton';
import { BackHeader } from '../history/components/BackHeader';
import { Skeleton } from '../history/components/Skeleton';
import { getRecipe, markNotForMe, undoNotForMe, type RecipeDetail } from './api/recipes';
import { recipesContent as c } from './content';
import { cardLine, proteinTag } from './recipes-view';

export function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [load, setLoad] = useState<'loading' | 'gone' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  const [marked, setMarked] = useState(false); // just marked: the undo window is open
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    void retry;
    let live = true;
    getRecipe(id)
      .then((r) => live && setRecipe(r))
      .catch((cause) => live && setLoad(cause instanceof ApiError && cause.status === 404 ? 'gone' : 'error'));
    return () => {
      live = false;
    };
  }, [id, retry]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const toList = () => (router.canGoBack() ? router.back() : router.replace('/recipes'));
  const header = <BackHeader onPress={toList} />;

  const mark = async () => {
    setFailed(false);
    try {
      await markNotForMe(id);
      setMarked(true);
      timer.current = setTimeout(toList, 5000);
    } catch {
      setFailed(true);
    }
  };
  const undo = async () => {
    clearTimeout(timer.current);
    setFailed(false);
    try {
      await undoNotForMe(id);
      setMarked(false);
      setRecipe((r) => r && { ...r, notForMe: false });
    } catch {
      setFailed(true);
      if (marked) timer.current = setTimeout(toList, 5000);
    }
  };

  if (load === 'gone')
    return (
      <HissaScreen>
        {header}
        <HissaText accessibilityRole="alert" style={{ marginTop: 16 }}>
          {c.detail.gone}
        </HissaText>
        <View style={{ marginTop: 16 }}>
          <PrimaryButton label={c.detail.backToRecipes} onPress={toList} />
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
  if (!recipe)
    return (
      <HissaScreen>
        {header}
        <Skeleton label={c.detail.loading} rows={3} />
      </HissaScreen>
    );

  const tag = proteinTag(recipe);
  return (
    <HissaScreen>
      {header}
      <HissaText variant="title" accessibilityRole="header" style={{ marginTop: 4 }}>
        {recipe.title}
      </HissaText>
      <HissaText variant="caption" style={{ marginTop: 4 }}>
        {cardLine(recipe)}
      </HissaText>
      <HissaText variant="caption">{[tag, c.estimate].filter(Boolean).join(' · ')}</HissaText>

      <HissaText variant="label" accessibilityRole="header" style={{ marginTop: 24 }}>
        {c.detail.ingredients}
      </HissaText>
      <View style={{ marginTop: 8, gap: 4 }}>
        {recipe.ingredients.map((i, n) => (
          <HissaText key={n}>{`${i.quantity} ${i.item}`}</HissaText>
        ))}
      </View>

      <HissaText variant="label" accessibilityRole="header" style={{ marginTop: 24 }}>
        {c.detail.steps}
      </HissaText>
      <View style={{ marginTop: 8, gap: 8 }}>
        {recipe.steps.map((s, n) => (
          <HissaText key={n}>{`${n + 1}. ${s}`}</HissaText>
        ))}
      </View>

      <View style={{ marginTop: 28, gap: 8 }}>
        {failed && <HissaText accessibilityRole="alert">{c.detail.actionError}</HissaText>}
        {marked ? (
          <>
            <HissaText accessibilityLiveRegion="polite">{c.detail.gotIt}</HissaText>
            <PrimaryButton outline label={c.detail.undo} onPress={() => void undo()} />
          </>
        ) : recipe.notForMe ? (
          <PrimaryButton outline label={c.detail.undoneNotForMe} onPress={() => void undo()} />
        ) : (
          <PrimaryButton outline label={c.detail.notForMe} onPress={() => void mark()} />
        )}
      </View>
    </HissaScreen>
  );
}
