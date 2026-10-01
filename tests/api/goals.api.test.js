import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from '../helpers/test-server.js';

let server;
let api;
before(async () => {
  server = await startTestServer();
  api = server.api;
});
after(async () => server.close());

describe('goals API', () => {
  it('creates a goal set for an effective date', async () => {
    const res = await api('PUT', '/api/goals/2026-01-01', {
      calories: 2000,
      proteinG: 150,
      carbsG: 200,
      fatG: 60,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.calories, 2000);
  });

  it('replaces values for the same effective date (FR-025c)', async () => {
    await api('PUT', '/api/goals/2026-01-01', {
      calories: 2100,
      proteinG: 150,
      carbsG: 200,
      fatG: 60,
    });
    const list = await api('GET', '/api/goals');
    assert.equal(list.body.goalSets.filter((g) => g.effectiveDate === '2026-01-01').length, 1);
    assert.equal(list.body.goalSets.find((g) => g.effectiveDate === '2026-01-01').calories, 2100);
  });

  it('rejects negative values (FR-025d)', async () => {
    const res = await api('PUT', '/api/goals/2026-02-01', {
      calories: -1,
      proteinG: 150,
      carbsG: 200,
      fatG: 60,
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.field, 'calories');
  });

  it('allows a future effective date (the FR-049 exception)', async () => {
    const res = await api('PUT', '/api/goals/2099-01-01', {
      calories: 2500,
      proteinG: 180,
      carbsG: 240,
      fatG: 70,
    });
    assert.equal(res.status, 200);
    await api('DELETE', '/api/goals/2099-01-01');
  });

  it('lists history newest first (FR-025a, FR-034e)', async () => {
    await api('PUT', '/api/goals/2026-03-01', {
      calories: 2400,
      proteinG: 180,
      carbsG: 240,
      fatG: 70,
    });
    const list = await api('GET', '/api/goals');
    const dates = list.body.goalSets.map((g) => g.effectiveDate);
    assert.deepEqual(dates, [...dates].sort().reverse());
  });

  it('resolves the effective set for a date', async () => {
    const res = await api('GET', '/api/goals/effective/2026-02-15');
    assert.equal(res.body.goalSet.effectiveDate, '2026-01-01');
  });

  it('returns null before the earliest set (FR-028)', async () => {
    const res = await api('GET', '/api/goals/effective/2025-01-01');
    assert.equal(res.body.goalSet, null);
  });

  it('deletes with 204 and falls back to the earlier set (FR-025e)', async () => {
    assert.equal((await api('DELETE', '/api/goals/2026-03-01')).status, 204);
    const res = await api('GET', '/api/goals/effective/2026-03-15');
    assert.equal(res.body.goalSet.effectiveDate, '2026-01-01');
  });

  it('404s when deleting a goal set that does not exist', async () => {
    assert.equal((await api('DELETE', '/api/goals/2026-03-01')).status, 404);
  });
});
