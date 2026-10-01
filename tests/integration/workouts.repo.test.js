import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb } from '../helpers/test-db.js';
import * as repo from '../../src/db/repositories/workouts.repo.js';
import * as exercisesRepo from '../../src/db/repositories/exercises.repo.js';

let testDb;
let squat;
let bench;

before(() => {
  testDb = createTestDb();
});
after(() => testDb.cleanup());

beforeEach(() => {
  testDb.db.exec('DELETE FROM workout_sets; DELETE FROM workout_sessions; DELETE FROM exercises');
  squat = exercisesRepo.create({ name: 'Back Squat', muscleGroup: 'legs' });
  bench = exercisesRepo.create({ name: 'Bench Press', muscleGroup: 'chest' });
});

const session = (date, entries) => repo.create({ date, note: null, entries });

describe('workouts repository', () => {
  it('stores a session with its sets in order', () => {
    const id = session('2026-09-01', [
      { exerciseId: squat.id, sets: [{ reps: 5, weightKg: 100 }, { reps: 5, weightKg: 105 }] },
      { exerciseId: bench.id, sets: [{ reps: 8, weightKg: 60 }] },
    ]);
    const found = repo.findById(id);
    assert.equal(found.entries.length, 2);
    assert.equal(found.entries[0].sets.length, 2);
    assert.equal(found.entries[0].sets[1].weightKg, 105);
  });

  it('cascades set deletion with the session (FR-010a)', () => {
    const id = session('2026-09-01', [{ exerciseId: squat.id, sets: [{ reps: 5, weightKg: 100 }] }]);
    repo.remove(id);
    assert.equal(testDb.db.prepare('SELECT COUNT(*) AS c FROM workout_sets').get().c, 0);
  });

  it('allows several sessions on one date (FR-011)', () => {
    session('2026-09-01', [{ exerciseId: squat.id, sets: [{ reps: 5, weightKg: 100 }] }]);
    session('2026-09-01', [{ exerciseId: bench.id, sets: [{ reps: 5, weightKg: 60 }] }]);
    assert.equal(repo.list({ from: '2026-09-01', to: '2026-09-01' }).length, 2);
  });

  it('replaces sets wholesale on update', () => {
    const id = session('2026-09-01', [{ exerciseId: squat.id, sets: [{ reps: 5, weightKg: 100 }] }]);
    repo.replace(id, {
      date: '2026-09-02',
      note: 'moved',
      entries: [{ exerciseId: squat.id, sets: [{ reps: 3, weightKg: 120 }] }],
    });
    const found = repo.findById(id);
    assert.equal(found.date, '2026-09-02');
    assert.equal(found.entries[0].sets.length, 1);
    assert.equal(found.entries[0].sets[0].weightKg, 120);
  });

  it('marks archived exercises in history but keeps them readable (FR-004d)', () => {
    const id = session('2026-09-01', [{ exerciseId: squat.id, sets: [{ reps: 5, weightKg: 100 }] }]);
    exercisesRepo.setArchived(squat.id, true);
    const found = repo.findById(id);
    assert.equal(found.entries[0].exerciseArchived, true);
    assert.equal(found.entries[0].exerciseName, 'Back Squat');
  });
});

describe('volume aggregates (FR-031b, SC-011)', () => {
  it('computes session volume as the sum of reps x weight', () => {
    session('2026-09-01', [
      { exerciseId: squat.id, sets: [{ reps: 5, weightKg: 100 }, { reps: 5, weightKg: 100 }] },
    ]);
    assert.equal(repo.volumeBySession('2026-09-01', '2026-09-01')[0].volume, 1000);
  });

  it('counts a bodyweight-only session as zero volume (FR-031d)', () => {
    session('2026-09-01', [{ exerciseId: squat.id, sets: [{ reps: 10, weightKg: 0 }] }]);
    assert.equal(repo.volumeBySession('2026-09-01', '2026-09-01')[0].volume, 0);
  });

  it('groups weekly volume from Monday (FR-031c)', () => {
    // 2026-09-01 is a Tuesday; 2026-09-06 is the following Sunday. Same ISO week.
    session('2026-09-01', [{ exerciseId: squat.id, sets: [{ reps: 1, weightKg: 100 }] }]);
    session('2026-09-06', [{ exerciseId: squat.id, sets: [{ reps: 1, weightKg: 100 }] }]);
    const weeks = repo.volumeByWeek('2026-08-01', '2026-10-01');
    assert.equal(weeks.length, 1);
    assert.equal(weeks[0].weekStart, '2026-08-31');
    assert.equal(weeks[0].volume, 200);
  });

  it('takes the max across every session on a date (FR-032a)', () => {
    session('2026-09-01', [{ exerciseId: squat.id, sets: [{ reps: 5, weightKg: 100 }] }]);
    session('2026-09-01', [{ exerciseId: squat.id, sets: [{ reps: 1, weightKg: 140 }] }]);
    const best = repo.bestWeightByDate(squat.id, '2026-09-01', '2026-09-01');
    assert.equal(best.length, 1);
    assert.equal(best[0].bestWeightKg, 140);
  });

  it('returns empty series for a range with no data (FR-034)', () => {
    assert.deepEqual(repo.volumeBySession('2020-01-01', '2020-12-31'), []);
  });
});
