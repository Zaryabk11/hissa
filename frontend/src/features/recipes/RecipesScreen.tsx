import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Card } from '../../shared/ui/hissa/Card';
import { HissaScreen } from '../../shared/ui/hissa/HissaScreen';
import { HissaText } from '../../shared/ui/hissa/HissaText';
import { PrimaryButton } from '../../shared/ui/hissa/PrimaryButton';
import { BackHeader } from '../history/components/BackHeader';
import { Skeleton } from '../history/components/Skeleton';
import { getRecipes, type RecipeCard as Recipe } from './api/recipes';
import { RecipeCard } from './components/RecipeCard';
import { recipesContent as c } from './content';
import { columnsFor } from './recipes-view';

export function RecipesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  // Refetch on focus so a recipe marked Not for me is gone when you come back.
  useFocusEffect(
    useCallback(() => {
      void retry;
      let live = true;
      getRecipes()
        .then((res) => live && setRecipes(res.recipes))
        .catch(() => live && setError(true));
      return () => {
        live = false;
      };
    }, [retry]),
  );

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
  if (!recipes)
    return (
      <HissaScreen>
        {header}
        <Skeleton label={c.loading} rows={4} />
      </HissaScreen>
    );

  const two = columnsFor(width) === 2;
  return (
    <HissaScreen>
      {header}
      {recipes.length === 0 ? (
        <Card style={{ marginTop: 28 }}>
          <HissaText muted>{c.empty}</HissaText>
        </Card>
      ) : (
        <View style={{ marginTop: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {recipes.map((r) => (
            <RecipeCard key={r.id} recipe={r} width={two ? '48%' : '100%'} onPress={() => router.push(`/recipes/${r.id}`)} />
          ))}
        </View>
      )}
    </HissaScreen>
  );
}
