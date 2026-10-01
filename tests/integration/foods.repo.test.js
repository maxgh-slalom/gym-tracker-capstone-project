import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb } from '../helpers/test-db.js';
import * as foodsRepo from '../../src/db/repositories/foods.repo.js';
import * as mealsRepo from '../../src/db/repositories/meal-entries.repo.js';

let testDb;
let yogurt;

before(() => {
  testDb = createTestDb();
});
after(() => testDb.cleanup());

beforeEach(() => {
  testDb.db.exec('DELETE FROM meal_entries; DELETE FROM foods');
  yogurt = foodsRepo.create({
    name: 'Greek Yogurt 2%',
    portionName: '1 cup',
    portionGrams: 227,
    calories: 146,
    proteinG: 20,
    carbsG: 8,
    fatG: 4,
  });
});

describe('foods repository', () => {
  it('finds by case-insensitive substring (FR-017a)', () => {
    assert.equal(foodsRepo.search({ term: 'YOGURT' }).foods.length, 1);
    assert.equal(foodsRepo.search({ term: 'greek' }).foods.length, 1);
  });

  it('returns an empty result rather than an error for no matches (FR-018)', () => {
    const result = foodsRepo.search({ term: 'zzzz' });
    assert.deepEqual(result.foods, []);
    assert.equal(result.total, 0);
  });

  it('honours the result limit', () => {
    for (let i = 0; i < 5; i += 1) {
      foodsRepo.create({ ...yogurt, name: `Filler ${i}` });
    }
    assert.equal(foodsRepo.search({ limit: 3 }).foods.length, 3);
  });

  it('rejects a non-positive portion weight (FR-024a)', () => {
    assert.throws(() => foodsRepo.create({ ...yogurt, name: 'Bad', portionGrams: 0 }));
  });

  it('enforces unique names', () => {
    assert.throws(() => foodsRepo.create({ ...yogurt, name: 'greek yogurt 2%' }));
  });

  it('hides archived foods from search (FR-004d)', () => {
    foodsRepo.setArchived(yogurt.id, true);
    assert.equal(foodsRepo.search({ term: 'yogurt' }).foods.length, 0);
    assert.equal(foodsRepo.search({ term: 'yogurt', includeArchived: true }).foods.length, 1);
  });

  it('counts referencing meal entries', () => {
    mealsRepo.create({ date: '2026-09-01', mealSlot: 'breakfast', foodId: yogurt.id, quantityG: 227 });
    assert.equal(foodsRepo.findById(yogurt.id).entryCount, 1);
  });

  it('blocks deletion of a referenced food via ON DELETE RESTRICT', () => {
    mealsRepo.create({ date: '2026-09-01', mealSlot: 'breakfast', foodId: yogurt.id, quantityG: 227 });
    assert.throws(() => foodsRepo.remove(yogurt.id));
  });
});

describe('meal entries repository', () => {
  it('stores the resolved gram quantity (FR-020)', () => {
    const entry = mealsRepo.create({
      date: '2026-09-01',
      mealSlot: 'lunch',
      foodId: yogurt.id,
      quantityG: 340.5,
    });
    assert.equal(entry.quantityG, 340.5);
    assert.equal(entry.food.portionGrams, 227);
  });

  it('lists a day grouped by nothing but ordered by id', () => {
    mealsRepo.create({ date: '2026-09-01', mealSlot: 'breakfast', foodId: yogurt.id, quantityG: 100 });
    mealsRepo.create({ date: '2026-09-01', mealSlot: 'dinner', foodId: yogurt.id, quantityG: 200 });
    mealsRepo.create({ date: '2026-09-02', mealSlot: 'lunch', foodId: yogurt.id, quantityG: 300 });
    assert.equal(mealsRepo.listByDate('2026-09-01').length, 2);
  });

  it('reads a range for the progress view', () => {
    mealsRepo.create({ date: '2026-09-01', mealSlot: 'breakfast', foodId: yogurt.id, quantityG: 100 });
    mealsRepo.create({ date: '2026-09-10', mealSlot: 'breakfast', foodId: yogurt.id, quantityG: 100 });
    assert.equal(mealsRepo.listByRange('2026-09-01', '2026-09-05').length, 1);
  });

  it('rejects a non-positive quantity at the database level (FR-021)', () => {
    assert.throws(() =>
      mealsRepo.create({ date: '2026-09-01', mealSlot: 'lunch', foodId: yogurt.id, quantityG: 0 }),
    );
  });

  it('rejects an unknown meal slot at the database level (FR-022a)', () => {
    assert.throws(() =>
      mealsRepo.create({ date: '2026-09-01', mealSlot: 'brunch', foodId: yogurt.id, quantityG: 100 }),
    );
  });
});
