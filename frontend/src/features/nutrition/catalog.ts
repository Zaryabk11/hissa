// Dish catalog for the demo. EVERY number here is an estimate (typical home portions), never a measurement.
// Pure data: no UI imports.
export type Unit = 'roti' | 'katori' | 'piece' | 'cup';

export type Dish = {
  id: string;
  /** Short display name, used on chips, plate labels and rows. */
  name: string;
  unit: Unit;
  /** Estimated kcal for one unit. */
  kcalPerUnit: number;
  /** Quantity a new plate starts with. */
  defaultQty: number;
  /** Bread: drawn as a stack beside the plate instead of a wedge on it. */
  bread?: boolean;
  /** Eat as much as you like: never scaled down in a light plan. */
  free?: boolean;
};

export const CATALOG: Dish[] = [
  { id: 'roti', name: 'Roti', unit: 'roti', kcalPerUnit: 110, defaultQty: 2, bread: true },
  { id: 'naan', name: 'Naan', unit: 'piece', kcalPerUnit: 260, defaultQty: 1, bread: true },
  { id: 'paratha', name: 'Paratha', unit: 'piece', kcalPerUnit: 260, defaultQty: 1, bread: true },
  { id: 'rice', name: 'Rice', unit: 'katori', kcalPerUnit: 200, defaultQty: 1 },
  { id: 'pulao', name: 'Pulao', unit: 'katori', kcalPerUnit: 230, defaultQty: 1 },
  { id: 'biryani', name: 'Biryani', unit: 'katori', kcalPerUnit: 290, defaultQty: 1 },
  { id: 'daal', name: 'Daal', unit: 'katori', kcalPerUnit: 150, defaultQty: 1 },
  { id: 'chana', name: 'Chana', unit: 'katori', kcalPerUnit: 210, defaultQty: 1 },
  { id: 'chicken-karahi', name: 'Chicken karahi', unit: 'katori', kcalPerUnit: 300, defaultQty: 1 },
  { id: 'chicken-curry', name: 'Chicken curry', unit: 'katori', kcalPerUnit: 250, defaultQty: 1 },
  { id: 'mutton-curry', name: 'Mutton curry', unit: 'katori', kcalPerUnit: 330, defaultQty: 1 },
  { id: 'haleem', name: 'Haleem', unit: 'katori', kcalPerUnit: 260, defaultQty: 1 },
  { id: 'nihari', name: 'Nihari', unit: 'katori', kcalPerUnit: 350, defaultQty: 1 },
  { id: 'sabzi', name: 'Sabzi', unit: 'katori', kcalPerUnit: 120, defaultQty: 1 },
  { id: 'palak-paneer', name: 'Palak paneer', unit: 'katori', kcalPerUnit: 280, defaultQty: 1 },
  { id: 'kebab', name: 'Kebab', unit: 'piece', kcalPerUnit: 110, defaultQty: 2 },
  { id: 'samosa', name: 'Samosa', unit: 'piece', kcalPerUnit: 260, defaultQty: 1 },
  { id: 'pakora', name: 'Pakora', unit: 'piece', kcalPerUnit: 60, defaultQty: 4 },
  { id: 'raita', name: 'Raita', unit: 'katori', kcalPerUnit: 90, defaultQty: 1 },
  { id: 'salad', name: 'Salad', unit: 'katori', kcalPerUnit: 30, defaultQty: 1, free: true },
  { id: 'egg', name: 'Egg', unit: 'piece', kcalPerUnit: 90, defaultQty: 2 },
  { id: 'chai', name: 'Chai', unit: 'cup', kcalPerUnit: 90, defaultQty: 1 },
  { id: 'lassi', name: 'Lassi', unit: 'cup', kcalPerUnit: 160, defaultQty: 1 },
  { id: 'kheer', name: 'Kheer', unit: 'katori', kcalPerUnit: 250, defaultQty: 1 },
  { id: 'gulab-jamun', name: 'Gulab jamun', unit: 'piece', kcalPerUnit: 150, defaultQty: 1 },
];

export const dishById = (id: string): Dish | undefined => CATALOG.find((d) => d.id === id);
