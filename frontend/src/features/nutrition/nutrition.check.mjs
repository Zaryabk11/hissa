// Run: node src/features/nutrition/nutrition.check.mjs   (Node 22.6+ strips the types; nothing to install)
import assert from 'node:assert/strict';
import { CATALOG } from './catalog.ts';
import { kcalForItems, planForRemaining, portionText, remainingBudget } from './engine.ts';

const plate = [
  { dishId: 'chicken-karahi', qty: 1 },
  { dishId: 'roti', qty: 2 },
  { dishId: 'raita', qty: 1 },
  { dishId: 'salad', qty: 1 },
];

assert.equal(CATALOG.length, 25);
assert.equal(new Set(CATALOG.map((d) => d.id)).size, CATALOG.length);
assert.equal(kcalForItems(plate), 300 + 220 + 90 + 30);
assert.equal(kcalForItems([{ dishId: 'nope', qty: 3 }]), 0);
assert.equal(remainingBudget(2000, 1500), 500);
assert.equal(remainingBudget(2000, 2300), -300);

// fits: returned as is
const fits = planForRemaining(900, plate);
assert.equal(fits.light, false);
assert.deepEqual(fits.items, plate);

// over: portions shrink in half steps, never below half, salad untouched, nothing removed, input not mutated
const light = planForRemaining(400, plate);
assert.equal(light.light, true);
assert.equal(light.items.length, plate.length);
assert.ok(light.kcal < kcalForItems(plate));
assert.ok(light.items.every((i) => i.qty >= 0.5 && i.qty * 2 === Math.round(i.qty * 2)));
assert.equal(light.items.find((i) => i.dishId === 'salad')?.qty, 1);
assert.ok(light.kcal <= 400);
assert.equal(plate[0].qty, 1);

// already over budget: aims at the light floor, portions never below half
const over = planForRemaining(-200, plate);
assert.equal(over.light, true);
assert.ok(over.items.every((i) => i.qty >= 0.5));
assert.ok(over.kcal <= 300);

assert.equal(portionText({ dishId: 'roti', qty: 1.5 }), '1.5 roti');
assert.equal(portionText({ dishId: 'chicken-karahi', qty: 0.5 }), 'Half katori');
assert.equal(portionText({ dishId: 'chicken-karahi', qty: 1 }), '1 katori');
assert.equal(portionText({ dishId: 'kebab', qty: 2 }), '2 pieces');
assert.equal(portionText({ dishId: 'chai', qty: 1 }), '1 cup');
assert.equal(portionText({ dishId: 'salad', qty: 1 }), 'As much as you like');

console.log('nutrition checks passed');
