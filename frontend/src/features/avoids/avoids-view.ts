import type { Avoids, ProteinType } from '../core/api';

const flip = <T,>(list: T[], x: T) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);

export const toggleProtein = (a: Avoids, p: ProteinType): Avoids => ({ ...a, proteins: flip(a.proteins, p) });
export const toggleDish = (a: Avoids, slug: string): Avoids => ({ ...a, dishes: flip(a.dishes, slug) });

export function filterDishes<T extends { name: string }>(dishes: T[], query: string, limit = 8): T[] {
  const q = query.trim().toLowerCase();
  return dishes.filter((d) => d.name.toLowerCase().includes(q)).slice(0, limit);
}

export function avoidsSummary(a: Avoids, nameOf: (slug: string) => string): string {
  const names = [...a.proteins.map((p) => p[0].toUpperCase() + p.slice(1)), ...a.dishes.map(nameOf)];
  return names.length ? names.join(', ') : 'Nothing yet';
}
