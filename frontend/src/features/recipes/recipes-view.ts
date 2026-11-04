import type { RecipeCard } from './api/recipes';

export const cardLine = (r: RecipeCard) =>
  `${r.minutes} min · about ${r.kcalPerUnit} kcal per ${r.unit} (estimate)`;

export const columnsFor = (width: number): 1 | 2 => (width >= 900 ? 2 : 1);

export const proteinTag = (r: Pick<RecipeCard, 'proteinType'>) =>
  r.proteinType ? r.proteinType[0].toUpperCase() + r.proteinType.slice(1) : null;

export const withoutRecipe = (list: RecipeCard[], id: string) => list.filter((r) => r.id !== id);

export const restore = (list: RecipeCard[], card: RecipeCard, index: number) => {
  const next = [...list];
  next.splice(index, 0, card);
  return next;
};
