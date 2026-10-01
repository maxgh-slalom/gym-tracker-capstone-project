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

describe('exercises API', () => {
  it('creates an exercise with 201', async () => {
    const res = await api('POST', '/api/exercises', { name: 'Back Squat', muscleGroup: 'legs' });
    assert.equal(res.status, 201);
    assert.equal(res.body.name, 'Back Squat');
  });

  it('rejects a duplicate name with 409 (FR-002)', async () => {
    const res = await api('POST', '/api/exercises', { name: 'back squat', muscleGroup: 'legs' });
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'CONFLICT');
  });

  it('rejects an unknown muscle group with 400 naming the field', async () => {
    const res = await api('POST', '/api/exercises', { name: 'Jogging', muscleGroup: 'cardio' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.field, 'muscleGroup');
  });

  it('rejects a blank name with 400', async () => {
    const res = await api('POST', '/api/exercises', { name: '   ', muscleGroup: 'legs' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.field, 'name');
  });

  it('archives and restores (FR-004, FR-004a)', async () => {
    const created = await api('POST', '/api/exercises', { name: 'Cable Crunch', muscleGroup: 'core' });
    const id = created.body.id;

    const archived = await api('POST', `/api/exercises/${id}/archive`);
    assert.equal(archived.status, 200);
    assert.equal(archived.body.archived, true);

    const list = await api('GET', '/api/exercises');
    assert.equal(list.body.exercises.some((e) => e.id === id), false);

    const withArchived = await api('GET', '/api/exercises?includeArchived=true');
    assert.equal(withArchived.body.exercises.some((e) => e.id === id), true);

    const restored = await api('POST', `/api/exercises/${id}/restore`);
    assert.equal(restored.body.archived, false);
  });

  it('deletes an unreferenced exercise with 204 (FR-004c)', async () => {
    const created = await api('POST', '/api/exercises', { name: 'Temp Lift', muscleGroup: 'other' });
    const res = await api('DELETE', `/api/exercises/${created.body.id}`);
    assert.equal(res.status, 204);
  });

  it('refuses to delete a referenced exercise with 409 (FR-004b)', async () => {
    const created = await api('POST', '/api/exercises', { name: 'Deadlift', muscleGroup: 'back' });
    await api('POST', '/api/workouts', {
      date: '2026-09-01',
      entries: [{ exerciseId: created.body.id, sets: [{ reps: 5, weightKg: 100 }] }],
    });
    const res = await api('DELETE', `/api/exercises/${created.body.id}`);
    assert.equal(res.status, 409);
    assert.match(res.body.error.message, /Archive it instead/);
  });

  it('returns 404 for an unknown exercise in the path', async () => {
    const res = await api('PATCH', '/api/exercises/9999', { name: 'Nope' });
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });
});
