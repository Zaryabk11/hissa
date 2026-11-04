import { Pressable, View } from 'react-native';
import { useHissaTheme } from '../../../shared/theme/HissaThemeProvider';
import { HissaText } from '../../../shared/ui/hissa/HissaText';
import type { RecipeCard as Recipe } from '../api/recipes';
import { recipesContent as c } from '../content';
import { cardLine, proteinTag } from '../recipes-view';

export function RecipeCard({ recipe, onPress, width }: { recipe: Recipe; onPress: () => void; width?: `${number}%` }) {
  const t = useHissaTheme();
  const tag = proteinTag(recipe);
  const line = cardLine(recipe);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={c.open(`${recipe.title}, ${line}`)}
      onPress={onPress}
      style={{ width, minHeight: 44, padding: 16, borderRadius: 18, backgroundColor: t.surf, borderWidth: 1, borderColor: t.hair, gap: 4 }}
    >
      <HissaText variant="label">{recipe.title}</HissaText>
      <HissaText variant="caption">{line}</HissaText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
        {tag && <HissaText variant="caption">{tag}</HissaText>}
        <HissaText variant="caption">{c.estimate}</HissaText>
      </View>
    </Pressable>
  );
}
