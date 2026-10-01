import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb } from '../helpers/test-db.js';
import { resetDemo } from '../../src/services/demo.service.js';
import * as healthRepo from '../../src/db/repositories/health.repo.js';
import { todayIso } from '../../src/validation/primitives.js';

let testDb;
before(() => {
  testDb = createTestDb();
});
after(() => testDb.cleanup());

function snapshot(db) {
  const tables = ['exercises', 'workout_sessions', 'workout_sets', 'body_weights', 'foods', 'meal_entries', 'goal_sets'];
  return tables.map((t) => JSON.stringify(db.prepare(`SELECT * FROM ${t}`).all())).join('|');
}

describe('demo seed', () => {
  it('populates every table (FR-040)', () => {
    const counts = resetDemo();
    assert.ok(counts.exercises >= 12);
    assert.ok(counts.sessions >= 28);
    assert.ok(counts.sets > 200);
    assert.ok(counts.bodyWeights >= 56);
    assert.ok(counts.foods >= 40);
    assert.ok(counts.mealEntries > 400);
    assert.equal(counts.goalSets, 2);
  });

  it('is deterministic across repeated runs (SC-008a)', () => {
    resetDemo();
    const first = snapshot(testDb.db);
    resetDemo();
    const second = snapshot(testDb.db);
    assert.equal(first, second);
  });

  it('does not duplicate on a second run (FR-041)', () => {
    const a = resetDemo();
    const b = resetDemo();
    assert.deepEqual(a, b);
  });

  it('provides two goal sets with different effective dates, so effective-dating is visible', () => {
    resetDemo();
    const dates = testDb.db
      .prepare('SELECT effective_date FROM goal_sets ORDER BY effective_date')
      .all()
      .map((r) => r.effective_date);
    assert.equal(dates.length, 2);
    assert.notEqual(dates[0], dates[1]);
  });

  it('generates dates relative to today (FR-041b)', () => {
    resetDemo();
    const latest = testDb.db.prepare('SELECT MAX(entry_date) AS d FROM body_weights').get().d;
    // Local date, matching FR-048 — a UTC date would disagree either side of midnight.
    assert.equal(latest, todayIso());
  });

  it('succeeds against an already-empty database (FR-041f)', () => {
    healthRepo.deleteAll(testDb.db);
    assert.equal(healthRepo.isEmpty(testDb.db), true);
    const counts = resetDemo();
    assert.ok(counts.exercises > 0);
  });

  it('replaces user data entirely (FR-041c)', () => {
    resetDemo();
    testDb.db
      .prepare(
        "INSERT INTO exercises (name, name_key, muscle_group, created_at) VALUES ('My Custom Lift','my custom lift','other','now')",
      )
      .run();
    resetDemo();
    const found = testDb.db.prepare("SELECT 1 FROM exercises WHERE name = 'My Custom Lift'").get();
    assert.equal(found, undefined);
  });
});
