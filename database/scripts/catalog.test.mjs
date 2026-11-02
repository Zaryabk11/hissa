import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseCatalog } from './build-seed.mjs';

const rows = parseCatalog(readFileSync(new URL('../data/catalog.csv', import.meta.url), 'utf8'));
const bySlug = Object.fromEntries(rows.map((r) => [r.slug, r]));

test('the real catalog parses and has at least 30 dishes', () => {
  assert.ok(rows.length >= 30, `only ${rows.length} rows`);
});

test('lab values win over the paper', () => {
  for (const [slug, kcal] of [
    ['chicken-karahi', 241],
    ['nihari', 172],
    ['haleem', 128],
    ['bhindi', 158],
  ]) {
    assert.equal(bySlug[slug]?.kcal_per_100g, kcal, slug);
    assert.equal(bySlug[slug].basis, 'lab', slug);
  }
});

test('roti and naan portions come out at realistic weights', () => {
  assert.equal(bySlug.roti?.unit, 'roti');
  assert.ok(bySlug.roti.grams_per_unit >= 30 && bySlug.roti.grams_per_unit <= 45);
  assert.ok(bySlug.naan?.grams_per_unit >= 45 && bySlug.naan.grams_per_unit <= 60);
});

test('slugs are unique and kebab-case', () => {
  const slugs = rows.map((r) => r.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const slug of slugs) assert.match(slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, slug);
});

test('no default-unit portion is over the calorie ceiling', () => {
  const CEILING_KCAL = 700;
  for (const r of rows) {
    const kcal = (r.kcal_per_100g * r.grams_per_unit) / 100;
    assert.ok(kcal <= CEILING_KCAL, `${r.slug}: ${kcal} kcal per ${r.unit}`);
  }
});

test('no fried row comes from INDB', () => {
  assert.deepEqual(
    rows.filter((r) => r.category === 'fried' && r.source === 'indb'),
    [],
  );
});
