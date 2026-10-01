import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from '../helpers/test-server.js';

let server;
let api;
let squatId;

before(async () => {
  server = await startTestServer();
  api = server.api;

  const squat = await api('POST', '/api/exercises', { name: 'Back Squat', muscleGroup: 'legs' });
  squatId = squat.body.id;

  await api('POST', '/api/workouts', {
    date: '2026-03-03',
    entries: [{ exerciseId: squatId, sets: [{ reps: 5, weightKg: 100 }] }],
  });
  await api('POST', '/api/workouts', {
    date: '2026-03-10',
    entries: [{ exerciseId: squatId, sets: [{ reps: 5, weightKg: 110 }] }],
  });

  await api('PUT', '/api/body-weights/2026-03-01', { weightKg: 82 });
  await api('PUT', '/api/body-weights/2026-03-31', { weightKg: 80 });

  await api('PUT', '/api/goals/2026-03-01', {
    calories: 2000,
    proteinG: 150,
    carbsG: 200,
    fatG: 60,
  });
  await api('PUT', '/api/goals/2026-03-15', {
    calories: 2400,
    proteinG: 180,
    carbsG: 240,
    fatG: 70,
  });

  const food = await api('POST', '/api/foods', {
    name: 'Test Food',
    portionName: '1 serving',
    portionGrams: 100,
    calories: 500,
    proteinG: 30,
    carbsG: 50,
    fatG: 15,
  });
  await api('POST', '/api/meal-entries', {
    date: '2026-03-05',
    mealSlot: 'lunch',
    foodId: food.body.id,
    servings: 1,
  });
  await api('POST', '/api/meal-entries', {
    date: '2026-03-20',
    mealSlot: 'lunch',
    foodId: food.body.id,
    servings: 1,
  });
});
after(async () => server.close());

describe('progress API', () => {
  it('rejects an inverted range with field "from" (FR-030b)', async () => {
    const res = await api('GET', '/api/progress?from=2026-03-31&to=2026-03-01');
    assert.equal(res.status, 400);
    assert.equal(res.body.error.field, 'from');
  });

  it('requires both from and to', async () => {
    assert.equal((await api('GET', '/api/progress?from=2026-03-01')).status, 400);
    assert.equal((await api('GET', '/api/progress')).status, 400);
  });

  it('returns body weight points and net change (FR-030c)', async () => {
    const res = await api('GET', '/api/progress?from=2026-03-01&to=2026-03-31');
    assert.equal(res.body.bodyWeight.points.length, 2);
    assert.equal(res.body.bodyWeight.netChangeKg, -2);
  });

  it('reports net change as null with fewer than two points (FR-030c)', async () => {
    const res = await api('GET', '/api/progress?from=2026-03-01&to=2026-03-02');
    assert.equal(res.body.bodyWeight.points.length, 1);
    assert.equal(res.body.bodyWeight.netChangeKg, null);
  });

  it('returns volume per session and per week (FR-031)', async () => {
    const res = await api('GET', '/api/progress?from=2026-03-01&to=2026-03-31');
    assert.equal(res.body.volumeBySession.points.length, 2);
    assert.equal(res.body.volumeBySession.points[0].volume, 500);
    assert.equal(res.body.volumeByWeek.points.length, 2);
  });

  it('omits exerciseBest unless an exercise is selected', async () => {
    const res = await api('GET', '/api/progress?from=2026-03-01&to=2026-03-31');
    assert.equal(res.body.exerciseBest, null);
  });

  it('returns per-exercise best when selected (FR-032)', async () => {
    const res = await api('GET', `/api/progress?from=2026-03-01&to=2026-03-31&exerciseId=${squatId}`);
    assert.equal(res.body.exerciseBest.points.length, 2);
    assert.equal(res.body.exerciseBest.points[1].bestWeightKg, 110);
  });

  it('uses the goal in effect on each day, not today (FR-033, SC-012)', async () => {
    const res = await api('GET', '/api/progress?from=2026-03-01&to=2026-03-31');
    const points = res.body.caloriesVsGoal.points;
    assert.equal(points.find((p) => p.date === '2026-03-05').goalCalories, 2000);
    assert.equal(points.find((p) => p.date === '2026-03-20').goalCalories, 2400);
  });

  it('returns empty series for a range with no data (FR-034)', async () => {
    const res = await api('GET', '/api/progress?from=2020-01-01&to=2020-01-31');
    assert.deepEqual(res.body.bodyWeight.points, []);
    assert.deepEqual(res.body.volumeBySession.points, []);
    assert.deepEqual(res.body.caloriesVsGoal.points, []);
  });

  it('rejects an unknown exerciseId with 400', async () => {
    const res = await api('GET', '/api/progress?from=2026-03-01&to=2026-03-31&exerciseId=9999');
    assert.equal(res.status, 400);
    assert.equal(res.body.error.field, 'exerciseId');
  });
});
