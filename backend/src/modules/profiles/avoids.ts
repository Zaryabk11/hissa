import type { ProteinType } from '../nutrition';
import type { Avoids } from './profiles.types';

export function isAvoided(
  avoids: Avoids,
  dish: { slug: string; proteinType: ProteinType | null },
): boolean {
  return (
    avoids.dishes.includes(dish.slug) ||
    (dish.proteinType !== null && avoids.proteins.includes(dish.proteinType))
  );
}
