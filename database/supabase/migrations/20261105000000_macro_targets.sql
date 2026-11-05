-- Optional daily macro targets in grams, set by the user in Profile.
alter table public.profiles
  add column protein_target_g integer check (protein_target_g > 0 and protein_target_g <= 1000),
  add column carbs_target_g integer check (carbs_target_g > 0 and carbs_target_g <= 1000),
  add column fat_target_g integer check (fat_target_g > 0 and fat_target_g <= 1000);
