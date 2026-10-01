import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb } from '../helpers/test-db.js';
import * as repo from '../../src/db/repositories/exercises.repo.js';
import * as workoutsRepo from '../../src/db/repositories/workouts.repo.js';

let testDb;
before(() => {
  testDb = createTestDb();
});
after(() => testDb.cleanup());

beforeEach(() => {
  testDb.db.exec('DELETE FROM workout_sets; DELETE FROM workout_sessions; DELETE FROM exercises');
});

describe('exercises repository', () => {
  it('creates and reads back an exercise', () => {
    const created = repo.create({ name: 'Back Squat', muscleGroup: 'legs' });
    assert.equal(created.name, 'Back Squat');
    assert.equal(created.archived, false);
    assert.equal(created.setCount, 0);
  });

  it('enforces case-insensitive name uniqueness (FR-002)', () => {
    repo.create({ name: 'Back Squat', muscleGroup: 'legs' });
    assert.ok(repo.findByNameKey('BACK SQUAT'));
    assert.throws(() => repo.create({ name: 'back squat', muscleGroup: 'legs' }));
  });

  it('archives and restores', () => {
    const e = repo.create({ name: 'Cable Crunch', muscleGroup: 'core' });
    assert.equal(repo.setArchived(e.id, true).archived, true);
    assert.equal(repo.setArchived(e.id, false).archived, false);
  });

  it('hides archived exercises from the default listing (FR-004d)', () => {
    const e = repo.create({ name: 'Cable Crunch', muscleGroup: 'core' });
    repo.setArchived(e.id, true);
    assert.equal(repo.list().length, 0);
    assert.equal(repo.list({ includeArchived: true }).length, 1);
  });

  it('counts referencing sets', () => {
    const e = repo.create({ name: 'Back Squat', muscleGroup: 'legs' });
    workoutsRepo.create({
      date: '2026-09-01',
      note: null,
      entries: [{ exerciseId: e.id, sets: [{ reps: 5, weightKg: 100 }] }],
    });
    assert.equal(repo.findById(e.id).setCount, 1);
  });

  it('blocks deletion of a referenced exercise via ON DELETE RESTRICT (FR-004b)', () => {
    const e = repo.create({ name: 'Back Squat', muscleGroup: 'legs' });
    workoutsRepo.create({
      date: '2026-09-01',
      note: null,
      entries: [{ exerciseId: e.id, sets: [{ reps: 5, weightKg: 100 }] }],
    });
    assert.throws(() => repo.remove(e.id));
  });

  it('archiving does not change historical totals (SC-009a)', () => {
    const e = repo.create({ name: 'Back Squat', muscleGroup: 'legs' });
    workoutsRepo.create({
      date: '2026-09-01',
      note: null,
      entries: [{ exerciseId: e.id, sets: [{ reps: 5, weightKg: 100 }] }],
    });
    const before = workoutsRepo.volumeBySession('2026-09-01', '2026-09-01');
    repo.setArchived(e.id, true);
    assert.deepEqual(workoutsRepo.volumeBySession('2026-09-01', '2026-09-01'), before);
  });
});
