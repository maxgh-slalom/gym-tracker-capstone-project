import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from '../helpers/test-server.js';
import { todayIso } from '../../src/validation/primitives.js';

let server;
let api;
before(async () => {
  server = await startTestServer();
  api = server.api;
});
after(async () => server.close());

describe('demo API', () => {
  it('reports an empty database before the reset', async () => {
    const res = await api('GET', '/api/health');
    assert.equal(res.body.empty, true);
  });

  it('rejects a missing confirmation with 400 (FR-041d)', async () => {
    const res = await api('POST', '/api/demo/reset', {});
    assert.equal(res.status, 400);
    assert.equal(res.body.error.field, 'confirm');
  });

  it('rejects the wrong case, since the token is case-sensitive', async () => {
    const res = await api('POST', '/api/demo/reset', { confirm: 'reset' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.field, 'confirm');
  });

  it('loads the seed against an empty database (FR-041f)', async () => {
    const res = await api('POST', '/api/demo/reset', { confirm: 'RESET' });
    assert.equal(res.status, 200);
    assert.equal(res.body.reset, true);
    assert.ok(res.body.counts.exercises >= 12);

    const health = await api('GET', '/api/health');
    assert.equal(health.body.empty, false);
  });

  it('produces the same counts on a repeat run (SC-008a)', async () => {
    const first = await api('POST', '/api/demo/reset', { confirm: 'RESET' });
    const second = await api('POST', '/api/demo/reset', { confirm: 'RESET' });
    assert.deepEqual(first.body.counts, second.body.counts);
  });

  it('erases user-created records too (FR-041c)', async () => {
    await api('POST', '/api/exercises', { name: 'My Custom Lift', muscleGroup: 'other' });
    await api('POST', '/api/demo/reset', { confirm: 'RESET' });

    const list = await api('GET', '/api/exercises?includeArchived=true');
    assert.equal(list.body.exercises.some((e) => e.name === 'My Custom Lift'), false);
  });

  it('leaves seeded records behaving exactly like user records (FR-042)', async () => {
    const list = await api('GET', '/api/exercises');
    const seeded = list.body.exercises[0];

    const renamed = await api('PATCH', `/api/exercises/${seeded.id}`, { name: 'Renamed Seeded Lift' });
    assert.equal(renamed.status, 200);
    assert.equal(renamed.body.name, 'Renamed Seeded Lift');

    const archived = await api('POST', `/api/exercises/${seeded.id}/archive`);
    assert.equal(archived.status, 200);
  });

  it('serves a populated progress view after the reset (SC-008)', async () => {
    await api('POST', '/api/demo/reset', { confirm: 'RESET' });
    const today = todayIso();
    const from = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);

    const res = await api('GET', `/api/progress?from=${from}&to=${today}`);
    assert.ok(res.body.bodyWeight.points.length > 20);
    assert.ok(res.body.volumeBySession.points.length > 10);
    assert.ok(res.body.caloriesVsGoal.points.length > 10);
  });
});

describe('API conventions', () => {
  it('returns JSON 404 for an unknown API route, not the SPA shell', async () => {
    const res = await api('GET', '/api/nope');
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });

  it('never leaks a stack trace (FR-038f)', async () => {
    const res = await api('GET', '/api/nutrition/day/bad-date');
    assert.equal(res.status, 400);
    assert.equal(JSON.stringify(res.body).includes('at '), false);
    assert.deepEqual(Object.keys(res.body.error).sort(), ['code', 'field', 'message']);
  });

  it('ignores unknown body fields', async () => {
    const res = await api('POST', '/api/exercises', {
      name: 'Field Test Lift',
      muscleGroup: 'other',
      bogusField: 'ignored',
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.bogusField, undefined);
  });
});
