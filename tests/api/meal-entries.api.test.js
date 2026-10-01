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
});
after(async () => server.close());

describe('meal entries API', () => {
  it('logs by servings (FR-019)', async () => {
    const res = await api('POST', '/api/meal-entries', {
      date: '2026-09-01',
      mealSlot: 'breakfast',
      foodId,
      servings: 2,
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.quantityG, 454);
    assert.equal(res.body.servings, 2);
    assert.equal(res.body.calories, 292);
  });

  it('logs by grams and matches the servings equivalent (SC-006b)', async () => {
    const res = await api('POST', '/api/meal-entries', {
      date: '2026-09-02',
      mealSlot: 'breakfast',
      foodId,
      grams: 454,
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.quantityG, 454);
    assert.equal(res.body.servings, 2);
    assert.equal(res.body.calories, 292);
  });

  it('rejects both servings and grams with field "quantity"', async () => {
    const res = await api('POST', '/api/meal-entries', {
      date: '2026-09-01',
      mealSlot: 'lunch',
      foodId,
      servings: 1,
      grams: 100,
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.field, 'quantity');
  });

  it('rejects neither servings nor grams', async () => {
    const res = await api('POST', '/api/meal-entries', {
      date: '2026-09-01',
      mealSlot: 'lunch',
      foodId,
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.field, 'quantity');
  });

  it('rejects a non-positive quantity (FR-021)', async () => {
    const res = await api('POST', '/api/meal-entries', {
      date: '2026-09-01',
      mealSlot: 'lunch',
      foodId,
      grams: 0,
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.field, 'grams');
  });

  it('rejects an unknown meal slot (FR-022a)', async () => {
    const res = await api('POST', '/api/meal-entries', {
      date: '2026-09-01',
      mealSlot: 'brunch',
      foodId,
      servings: 1,
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.field, 'mealSlot');
  });

  it('rejects an unknown foodId with 400, not 404', async () => {
    const res = await api('POST', '/api/meal-entries', {
      date: '2026-09-01',
      mealSlot: 'lunch',
      foodId: 9999,
      servings: 1,
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.field, 'foodId');
  });

  it('rejects an archived food (FR-004d)', async () => {
    const archived = await api('POST', '/api/foods', {
      name: 'Discontinued Bar',
      portionName: '1 bar',
      portionGrams: 60,
      calories: 200,
      proteinG: 15,
      carbsG: 20,
      fatG: 7,
    });
    await api('POST', `/api/foods/${archived.body.id}/archive`);
    const res = await api('POST', '/api/meal-entries', {
      date: '2026-09-01',
      mealSlot: 'snack',
      foodId: archived.body.id,
      servings: 1,
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.field, 'foodId');
  });

  it('updates and deletes an entry (FR-023)', async () => {
    const created = await api('POST', '/api/meal-entries', {
      date: '2026-09-03',
      mealSlot: 'dinner',
      foodId,
      servings: 1,
    });
    const updated = await api('PATCH', `/api/meal-entries/${created.body.id}`, { servings: 3 });
    assert.equal(updated.body.servings, 3);

    assert.equal((await api('DELETE', `/api/meal-entries/${created.body.id}`)).status, 204);
    assert.equal((await api('DELETE', `/api/meal-entries/${created.body.id}`)).status, 404);
  });
});
