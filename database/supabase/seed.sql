-- PLACEHOLDER dishes for local development. Nutrition numbers are rough and NOT verified;
-- replace with the real 30-40 dish catalog before any user sees a calorie number.
insert into public.dishes (slug, name, category, unit, grams_per_unit, local_calories, local_protein_g, local_carbs_g, local_fat_g) values
  ('chicken-karahi', 'Chicken karahi', 'meat', 'katori', 150, 250, 20, 6, 16),
  ('daal', 'Daal', 'lentil', 'katori', 150, 150, 9, 22, 3),
  ('roti', 'Roti', 'roti', 'roti', 40, 110, 3.5, 22, 1),
  ('biryani', 'Biryani', 'rice', 'plate', 300, 520, 22, 70, 16),
  ('raita', 'Raita', 'other', 'katori', 100, 60, 3, 5, 3)
on conflict (slug) do nothing;
