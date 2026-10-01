import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from '../helpers/test-server.js';

let server;
let api;
let yogurtId;

const YOGURT = {
  name: 'Greek Yogurt 2%',
  portionName: '1 cup',
  portionGrams: 227,
  calories: 146,
  proteinG: 20,
  carbsG: 8,
  fatG: 4,
};

before(async () => {
  server = await startTestServer();
  api = server.api;
  const created = await api('POST', '/api/foods', YOGURT);
  yogurtId = created.body.id;
});
after(async () => server.close());

describe('foods API', () => {
  it('searches case-insensitively (FR-017)', async () => {
    const res = await api('GET', '/api/foods?search=YOGURT');
    assert.equal(res.status, 200);
    assert.equal(res.body.foods.length, 1);
  });

  it('returns 200 with an empty list for no matches (FR-018)', async () => {
    const res = await api('GET', '/api/foods?search=zzzzz');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.foods, []);
    assert.equal(res.body.total, 0);
  });

  it('rejects a duplicate name with 409', async () => {
    const res = await api('POST', '/api/foods', YOGURT);
    assert.equal(res.status, 409);
  });

  it('rejects a non-positive portion weight (FR-024a)', async () => {
    const res = await api('POST', '/api/foods', { ...YOGURT, name: 'Bad Food', portionGrams: 0 });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.field, 'portionGrams');
  });

  it('allows editing the name of an unreferenced food', async () => {
    const res = await api('PATCH', `/api/foods/${yogurtId}`, { name: 'Greek Yogurt 2% Plain' });
    assert.equal(res.status, 200);
    await api('PATCH', `/api/foods/${yogurtId}`, { name: YOGURT.name });
  });

  it('allows editing nutrition while unreferenced', async () => {
    const res = await api('PATCH', `/api/foods/${yogurtId}`, { calories: 150 });
    assert.equal(res.status, 200);
    await api('PATCH', `/api/foods/${yogurtId}`, { calories: 146 });
  });

  it('locks nutrition once referenced, with 409 naming the field (FR-024c)', async () => {
    await api('POST', '/api/meal-entries', {
      date: '2026-09-01',
      mealSlot: 'breakfast',
      foodId: yogurtId,
      servings: 1,
    });

    const res = await api('PATCH', `/api/foods/${yogurtId}`, { calories: 999 });
    assert.equal(res.status, 409);
    assert.equal(res.body.error.field, 'calories');
    assert.match(res.body.error.message, /Create a new food instead/);
  });

  it('locks portionGrams once referenced (FR-024c)', async () => {
    const res = await api('PATCH', `/api/foods/${yogurtId}`, { portionGrams: 300 });
    assert.equal(res.status, 409);
    assert.equal(res.body.error.field, 'portionGrams');
  });

  it('still allows renaming a referenced food (FR-024d)', async () => {
    const res = await api('PATCH', `/api/foods/${yogurtId}`, { name: 'Greek Yogurt, 2% fat' });
    assert.equal(res.status, 200);
  });

  it('refuses to delete a referenced food with 409', async () => {
    const res = await api('DELETE', `/api/foods/${yogurtId}`);
    assert.equal(res.status, 409);
  });
});
