import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { HissaText } from '../../../shared/ui/hissa/HissaText';
import { getRecipes, type RecipeCard as Recipe } from '../api/recipes';
import { recipesContent as c } from '../content';
import { RecipeCard } from './RecipeCard';

// Fetches its own data and shows nothing on empty or error, so Today never breaks because of recipes.
export function TodayRecipes({ refreshKey }: { refreshKey: number }) {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  // Refetch on focus (a recipe may have been marked Not for me) and on pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      void refreshKey;
      let live = true;
      getRecipes()
        .then((res) => live && setRecipes(res.recipes.slice(0, 3)))
        .catch(() => {});
      return () => {
        live = false;
      };
    }, [refreshKey]),
  );
  if (recipes.length === 0) return null;
  return (
    <View style={{ marginTop: 20, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <HissaText variant="label" accessibilityRole="header">
          {c.title}
        </HissaText>
        <Pressable accessibilityRole="button" onPress={() => router.push('/recipes')} style={{ minHeight: 44, justifyContent: 'center', paddingLeft: 12 }}>
          <HissaText variant="button">{c.seeAll}</HissaText>
        </Pressable>
      </View>
      {recipes.map((r) => (
        <RecipeCard key={r.id} recipe={r} onPress={() => router.push(`/recipes/${r.id}`)} />
      ))}
    </View>
  );
}
