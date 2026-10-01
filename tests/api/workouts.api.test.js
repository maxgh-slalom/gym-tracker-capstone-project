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
});
after(async () => server.close());

const validSession = (overrides = {}) => ({
  date: '2026-09-01',
  entries: [{ exerciseId: squatId, sets: [{ reps: 5, weightKg: 100 }] }],
  ...overrides,
});

describe('workouts API', () => {
  it('creates a session with 201 and returns its detail', async () => {
    const res = await api('POST', '/api/workouts', validSession({ note: 'Felt strong' }));
    assert.equal(res.status, 201);
    assert.equal(res.body.note, 'Felt strong');
    assert.equal(res.body.entries[0].sets[0].weightKg, 100);
    assert.equal(res.body.totalVolume, 500);
  });

  it('rejects empty entries with 400 (FR-005b)', async () => {
    const res = await api('POST', '/api/workouts', validSession({ entries: [] }));
    assert.equal(res.status, 400);
    assert.equal(res.body.error.field, 'entries');
  });

  it('rejects an entry with no sets with 400', async () => {
    const res = await api('POST', '/api/workouts', {
      date: '2026-09-01',
      entries: [{ exerciseId: squatId, sets: [] }],
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.field, 'entries[0].sets');
  });

  it('rejects non-positive reps with a precise field path', async () => {
    const res = await api('POST', '/api/workouts', {
      date: '2026-09-01',
      entries: [{ exerciseId: squatId, sets: [{ reps: 5, weightKg: 100 }, { reps: 0, weightKg: 100 }] }],
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.field, 'entries[0].sets[1].reps');
  });

  it('rejects negative weight', async () => {
    const res = await api('POST', '/api/workouts', {
      date: '2026-09-01',
      entries: [{ exerciseId: squatId, sets: [{ reps: 5, weightKg: -1 }] }],
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.field, 'entries[0].sets[0].weightKg');
  });

  it('accepts zero weight for bodyweight work (FR-007)', async () => {
    const res = await api('POST', '/api/workouts', {
      date: '2026-09-01',
      entries: [{ exerciseId: squatId, sets: [{ reps: 10, weightKg: 0 }] }],
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.totalVolume, 0);
  });

  it('rejects a future date with 400 (FR-049)', async () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const res = await api('POST', '/api/workouts', {
      date: future.toISOString().slice(0, 10),
      entries: [{ exerciseId: squatId, sets: [{ reps: 5, weightKg: 100 }] }],
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.field, 'date');
  });

  it('rejects an unknown exerciseId with 400, not 404 (contract convention)', async () => {
    const res = await api('POST', '/api/workouts', {
      date: '2026-09-01',
      entries: [{ exerciseId: 9999, sets: [{ reps: 5, weightKg: 100 }] }],
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.field, 'entries[0].exerciseId');
  });

  it('rejects an archived exerciseId with 400 (FR-004d)', async () => {
    const created = await api('POST', '/api/exercises', { name: 'Retired Lift', muscleGroup: 'other' });
    await api('POST', `/api/exercises/${created.body.id}/archive`);
    const res = await api('POST', '/api/workouts', {
      date: '2026-09-01',
      entries: [{ exerciseId: created.body.id, sets: [{ reps: 5, weightKg: 100 }] }],
    });
    assert.equal(res.status, 400);
    assert.match(res.body.error.message, /archived/);
  });

  it('replaces a session in full with PUT', async () => {
    const created = await api('POST', '/api/workouts', validSession());
    const res = await api('PUT', `/api/workouts/${created.body.id}`, {
      date: '2026-09-02',
      entries: [{ exerciseId: squatId, sets: [{ reps: 3, weightKg: 120 }] }],
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.date, '2026-09-02');
    assert.equal(res.body.totalVolume, 360);
  });

  it('deletes a session with 204', async () => {
    const created = await api('POST', '/api/workouts', validSession());
    assert.equal((await api('DELETE', `/api/workouts/${created.body.id}`)).status, 204);
    assert.equal((await api('GET', `/api/workouts/${created.body.id}`)).status, 404);
  });

  it('lists history newest first (FR-009, FR-034e)', async () => {
    const list = await api('GET', '/api/workouts?limit=50');
    const dates = list.body.sessions.map((s) => s.date);
    assert.deepEqual(dates, [...dates].sort().reverse());
  });

  it('includes setCount and totalVolume in the list (FR-009a)', async () => {
    const list = await api('GET', '/api/workouts?limit=1');
    assert.ok('setCount' in list.body.sessions[0]);
    assert.ok('totalVolume' in list.body.sessions[0]);
  });
});
