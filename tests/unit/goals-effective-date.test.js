import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb } from '../helpers/test-db.js';
import * as goals from '../../src/services/goals.service.js';

let testDb;
before(() => {
  testDb = createTestDb();
  goals.upsert('2026-01-01', { calories: 2000, proteinG: 150, carbsG: 200, fatG: 60 });
  goals.upsert('2026-03-01', { calories: 2400, proteinG: 180, carbsG: 240, fatG: 70 });
});
after(() => testDb.cleanup());

describe('effective-dated goals (FR-025a)', () => {
  it('returns null before the earliest set (FR-028)', () => {
    assert.equal(goals.effectiveFor('2025-12-31'), null);
  });

  it('uses the set effective on exactly that date', () => {
    assert.equal(goals.effectiveFor('2026-01-01').calories, 2000);
  });

  it('keeps the earlier set until the next takes effect (FR-025b)', () => {
    assert.equal(goals.effectiveFor('2026-02-28').calories, 2000);
  });

  it('switches on the new effective date', () => {
    assert.equal(goals.effectiveFor('2026-03-01').calories, 2400);
  });

  it('carries the latest set forward indefinitely', () => {
    assert.equal(goals.effectiveFor('2027-06-15').calories, 2400);
  });
});

describe('range resolution (FR-033, SC-012)', () => {
  it('assigns each day the goal in effect on that day', () => {
    const map = goals.effectiveForRange('2026-02-27', '2026-03-02');
    assert.equal(map.get('2026-02-27').calories, 2000);
    assert.equal(map.get('2026-02-28').calories, 2000);
    assert.equal(map.get('2026-03-01').calories, 2400);
    assert.equal(map.get('2026-03-02').calories, 2400);
  });

  it('yields null for days before any goal set', () => {
    const map = goals.effectiveForRange('2025-12-30', '2026-01-01');
    assert.equal(map.get('2025-12-30'), null);
    assert.equal(map.get('2026-01-01').calories, 2000);
  });

  it('covers every day in the range inclusively', () => {
    const map = goals.effectiveForRange('2026-01-01', '2026-01-05');
    assert.equal(map.size, 5);
  });
});

describe('deletion fallback (FR-025e)', () => {
  it('falls back to the next-earlier set', () => {
    goals.upsert('2026-06-01', { calories: 2600, proteinG: 1, carbsG: 1, fatG: 1 });
    assert.equal(goals.effectiveFor('2026-06-02').calories, 2600);
    goals.remove('2026-06-01');
    assert.equal(goals.effectiveFor('2026-06-02').calories, 2400);
  });
});
