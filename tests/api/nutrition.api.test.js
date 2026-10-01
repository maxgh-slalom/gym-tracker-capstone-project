import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from '../helpers/test-server.js';

let server;
let api;
let foodId;

before(async () => {
  server = await startTestServer();
  api = server.api;

  const food = await api('POST', '/api/foods', {
    name: 'Greek Yogurt 2%',
    portionName: '1 cup',
    portionGrams: 227,
    calories: 146,
    proteinG: 20,
    carbsG: 8,
    fatG: 4,
  });
  foodId = food.body.id;

  await api('PUT', '/api/goals/2026-01-01', {
    calories: 2000,
    proteinG: 150,
    carbsG: 200,
    fatG: 60,
  });
});
after(async () => server.close());

const log = (date, mealSlot, servings) =>
  api('POST', '/api/meal-entries', { date, mealSlot, foodId, servings });

describe('nutrition day view', () => {
  it('reports zero totals and the effective goals for an empty day', async () => {
    const res = await api('GET', '/api/nutrition/day/2026-05-01');
    assert.equal(res.status, 200);
    assert.equal(res.body.totals.calories, 0);
    assert.equal(res.body.goals.calories, 2000);
    assert.equal(res.body.comparison.calories.remaining, 2000);
  });

  it('returns null goals and comparison before any goal set (FR-028)', async () => {
    const res = await api('GET', '/api/nutrition/day/2025-06-01');
    assert.equal(res.body.goals, null);
    assert.equal(res.body.comparison, null);
    assert.equal(res.body.totals.calories, 0);
  });

  it('groups entries into the four fixed slots (FR-022a)', async () => {
    await log('2026-05-02', 'breakfast', 1);
    await log('2026-05-02', 'dinner', 2);
    const res = await api('GET', '/api/nutrition/day/2026-05-02');
    assert.deepEqual(Object.keys(res.body.meals), ['breakfast', 'lunch', 'dinner', 'snack']);
    assert.equal(res.body.meals.breakfast.length, 1);
    assert.equal(res.body.meals.lunch.length, 0);
    assert.equal(res.body.meals.dinner.length, 1);
  });

  it('day total equals the sum of its entries (SC-006)', async () => {
    const res = await api('GET', '/api/nutrition/day/2026-05-02');
    const entries = Object.values(res.body.meals).flat();
    const summedDisplayed = entries.reduce((sum, e) => sum + e.calories, 0);
    // 1 + 2 servings of a 146 kcal portion = 438 exactly.
    assert.equal(res.body.totals.calories, 438);
    assert.equal(summedDisplayed, 438);
  });

  it('recalculates immediately when an entry is removed (FR-029)', async () => {
    const created = await log('2026-05-03', 'lunch', 1);
    const before = await api('GET', '/api/nutrition/day/2026-05-03');
    assert.equal(before.body.totals.calories, 146);

    await api('DELETE', `/api/meal-entries/${created.body.id}`);
    const after = await api('GET', '/api/nutrition/day/2026-05-03');
    assert.equal(after.body.totals.calories, 0);
  });

  it('flags an exceeded goal explicitly (FR-027a)', async () => {
    for (let i = 0; i < 15; i += 1) await log('2026-05-04', 'dinner', 1);
    const res = await api('GET', '/api/nutrition/day/2026-05-04');
    assert.equal(res.body.comparison.calories.exceeded, true);
    assert.ok(res.body.comparison.calories.remaining < 0);
  });

  it('treats a goal met exactly as not exceeded (FR-027a)', async () => {
    await api('PUT', '/api/goals/2026-05-05', {
      calories: 146,
      proteinG: 20,
      carbsG: 8,
      fatG: 4,
    });
    await log('2026-05-05', 'breakfast', 1);
    const res = await api('GET', '/api/nutrition/day/2026-05-05');
    assert.equal(res.body.comparison.calories.exceeded, false);
    assert.equal(res.body.comparison.calories.remaining, 0);
  });

  it('keeps past days on their own goals after a change (SC-006a)', async () => {
    const before = await api('GET', '/api/nutrition/day/2026-05-02');
    assert.equal(before.body.goals.calories, 2000);

    await api('PUT', '/api/goals/2026-09-01', {
      calories: 3000,
      proteinG: 200,
      carbsG: 300,
      fatG: 90,
    });

    const after = await api('GET', '/api/nutrition/day/2026-05-02');
    assert.equal(after.body.goals.calories, 2000);
  });

  it('rejects a malformed date', async () => {
    const res = await api('GET', '/api/nutrition/day/not-a-date');
    assert.equal(res.status, 400);
    assert.equal(res.body.error.field, 'date');
  });
});
