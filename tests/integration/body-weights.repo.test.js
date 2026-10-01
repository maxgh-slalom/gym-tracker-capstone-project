import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb } from '../helpers/test-db.js';
import * as repo from '../../src/db/repositories/body-weights.repo.js';

let testDb;
before(() => {
  testDb = createTestDb();
});
after(() => testDb.cleanup());
beforeEach(() => testDb.db.exec('DELETE FROM body_weights'));

describe('body weights repository', () => {
  it('inserts a new entry and reports it as not replaced', () => {
    const result = repo.upsert('2026-09-01', 80.5);
    assert.equal(result.replaced, false);
    assert.equal(result.entry.weightKg, 80.5);
  });

  it('replaces rather than duplicating on the same date (FR-013)', () => {
    repo.upsert('2026-09-01', 80.5);
    const second = repo.upsert('2026-09-01', 79.9);
    assert.equal(second.replaced, true);
    assert.equal(repo.list().length, 1);
    assert.equal(repo.findByDate('2026-09-01').weightKg, 79.9);
  });

  it('rejects a non-positive weight at the database level', () => {
    assert.throws(() => repo.upsert('2026-09-01', 0));
  });

  it('lists newest first (FR-034e)', () => {
    repo.upsert('2026-09-01', 80);
    repo.upsert('2026-09-03', 79);
    repo.upsert('2026-09-02', 79.5);
    assert.deepEqual(
      repo.list().map((e) => e.date),
      ['2026-09-03', '2026-09-02', '2026-09-01'],
    );
  });

  it('filters by range and returns ascending points for trends', () => {
    repo.upsert('2026-08-01', 82);
    repo.upsert('2026-09-01', 80);
    repo.upsert('2026-10-01', 78);
    const points = repo.rangePoints('2026-08-15', '2026-09-15');
    assert.equal(points.length, 1);
    assert.equal(points[0].date, '2026-09-01');
  });

  it('reports whether a delete removed anything', () => {
    repo.upsert('2026-09-01', 80);
    assert.equal(repo.remove('2026-09-01'), true);
    assert.equal(repo.remove('2026-09-01'), false);
  });
});
