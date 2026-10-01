/**
 * SC-007 / SC-007a: every endpoint must answer within 200 ms on the reference dataset
 * (500 sessions, 5,000 sets, 500 body weight entries, 2,000 meal entries).
 */

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb } from '../helpers/test-db.js';
import { startTestServer } from '../helpers/test-server.js';
import { todayIso } from '../../src/validation/primitives.js';

const BUDGET_MS = 200;

let server;
let api;
let squatId;

function shift(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

before(async () => {
  server = await startTestServer();
  api = server.api;
  const db = (await import('../../src/db/connection.js')).getDb();

  db.exec('BEGIN');

  const ex = db.prepare(
    "INSERT INTO exercises (name, name_key, muscle_group, created_at) VALUES (?, ?, 'legs', 'now')",
  );
  const exerciseIds = [];
  for (let i = 0; i < 10; i += 1) {
    exerciseIds.push(Number(ex.run(`Exercise ${i}`, `exercise ${i}`).lastInsertRowid));
  }
  squatId = exerciseIds[0];

  const insertSession = db.prepare(
    "INSERT INTO workout_sessions (session_date, note, created_at) VALUES (?, NULL, 'now')",
  );
  const insertSet = db.prepare(
    'INSERT INTO workout_sets (session_id, exercise_id, position, reps, weight_kg) VALUES (?, ?, ?, ?, ?)',
  );
  // 500 sessions x 10 sets = 5,000 sets
  for (let s = 0; s < 500; s += 1) {
    const id = Number(insertSession.run(shift(todayIso(), -s)).lastInsertRowid);
    for (let k = 0; k < 10; k += 1) {
      insertSet.run(id, exerciseIds[k % exerciseIds.length], k, 5 + (k % 5), 60 + (k % 40));
    }
  }

  const insertWeight = db.prepare(
    "INSERT INTO body_weights (entry_date, weight_kg, created_at, updated_at) VALUES (?, ?, 'now', 'now')",
  );
  for (let d = 0; d < 500; d += 1) insertWeight.run(shift(todayIso(), -d), 80 - d * 0.005);

  const insertFood = db.prepare(
    `INSERT INTO foods (name, name_key, portion_name, portion_grams, calories, protein_g, carbs_g, fat_g, is_builtin, created_at)
     VALUES (?, ?, '1 serving', 100, 200, 20, 20, 5, 1, 'now')`,
  );
  const foodIds = [];
  for (let i = 0; i < 50; i += 1) {
    foodIds.push(Number(insertFood.run(`Food ${i}`, `food ${i}`).lastInsertRowid));
  }

  const insertMeal = db.prepare(
    "INSERT INTO meal_entries (entry_date, meal_slot, food_id, quantity_g, created_at) VALUES (?, ?, ?, ?, 'now')",
  );
  const slots = ['breakfast', 'lunch', 'dinner', 'snack'];
  // 500 days x 4 entries = 2,000 meal entries
  for (let d = 0; d < 500; d += 1) {
    for (let m = 0; m < 4; m += 1) {
      insertMeal.run(shift(todayIso(), -d), slots[m], foodIds[(d + m) % foodIds.length], 150);
    }
  }

  db.prepare(
    "INSERT INTO goal_sets (effective_date, calories, protein_g, carbs_g, fat_g, created_at) VALUES (?, 2400, 180, 240, 70, 'now')",
  ).run(shift(todayIso(), -500));

  db.exec('COMMIT');
});

after(async () => server.close());

async function timed(path) {
  const started = performance.now();
  const res = await api('GET', path);
  const elapsed = performance.now() - started;
  assert.equal(res.status, 200, `${path} returned ${res.status}`);
  return elapsed;
}

describe('performance on the reference dataset', () => {
  it('workout history responds within budget', async () => {
    const ms = await timed('/api/workouts?limit=50');
    assert.ok(ms < BUDGET_MS, `workout history took ${ms.toFixed(1)}ms`);
  });

  it('session detail responds within budget', async () => {
    const list = await api('GET', '/api/workouts?limit=1');
    const ms = await timed(`/api/workouts/${list.body.sessions[0].id}`);
    assert.ok(ms < BUDGET_MS, `session detail took ${ms.toFixed(1)}ms`);
  });

  it('exercise list responds within budget', async () => {
    const ms = await timed('/api/exercises');
    assert.ok(ms < BUDGET_MS, `exercise list took ${ms.toFixed(1)}ms`);
  });

  it('body weight history responds within budget', async () => {
    const ms = await timed('/api/body-weights');
    assert.ok(ms < BUDGET_MS, `body weight history took ${ms.toFixed(1)}ms`);
  });

  it('food search responds within budget', async () => {
    const ms = await timed('/api/foods?search=food&limit=100');
    assert.ok(ms < BUDGET_MS, `food search took ${ms.toFixed(1)}ms`);
  });

  it('nutrition day view responds within budget', async () => {
    const ms = await timed(`/api/nutrition/day/${todayIso()}`);
    assert.ok(ms < BUDGET_MS, `day view took ${ms.toFixed(1)}ms`);
  });

  it('progress over a 90-day range responds within budget', async () => {
    const ms = await timed(
      `/api/progress?from=${shift(todayIso(), -90)}&to=${todayIso()}&exerciseId=${squatId}`,
    );
    assert.ok(ms < BUDGET_MS, `progress (90d) took ${ms.toFixed(1)}ms`);
  });

  it('progress over the full dataset responds within budget', async () => {
    const ms = await timed(`/api/progress?from=${shift(todayIso(), -500)}&to=${todayIso()}`);
    assert.ok(ms < BUDGET_MS, `progress (500d) took ${ms.toFixed(1)}ms`);
  });
});
