import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { HissaText } from '../../../shared/ui/hissa/HissaText';
import { getRecipes, type RecipeCard as Recipe } from '../api/recipes';
import { recipesContent as c } from '../content';
import { RecipeCard } from './RecipeCard';

// Fetches its own data and shows nothing on empty or error, so Today never breaks because of recipes.
export function TodayRecipes() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  useEffect(() => {
    let live = true;
    getRecipes()
      .then((res) => live && setRecipes(res.recipes.slice(0, 3)))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
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
